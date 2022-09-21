import { InjectRepository } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { Code, Repository } from 'typeorm';
import { createChatMessageDto } from '../dtos/chatMessage.dto';
import * as bcrypt from 'bcrypt';
import { NotFoundError } from 'rxjs';
import { UserService } from 'src/user/user.service';
import { ChatGateway } from './chat.gateway';
import e from 'express';
import { NotificationService } from 'src/notifications/notification.service';
import { MuteService } from './mute/mute.service';

type Message = {
  text: string;
  date: Date;
  username: string;
  ownerId: string;
};

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private chatMessageRepo: Repository<ChatMessage>,
    @InjectRepository(ChatRoom)
    private chatRoomRepo: Repository<ChatRoom>,
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private userService: UserService,

    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,

    private notifService: NotificationService,
    private muteService: MuteService,
  ) {}

  async findOrCreatePrivateRoom(users: string[]) {
    const members: User[] = await this.userRepo.find({
      where: [{ uid: users[0] }, { uid: users[1] }],
    });
    const chatRooms: ChatRoom[] = await this.chatRoomRepo.find({
      where: [
        {
          type: 'private',
        },
      ],
      relations: ['members', 'messages'],
    });
    const room = chatRooms.filter((c) => {
      return (
        c.members.filter((m) => {
          return m.uid == users[0] || m.uid == users[1];
        }).length == 2
      );
    });
    if (!room.length) {
      const r = await this.chatRoomRepo.save({
        members: members,
        admins: members,
        banned: [],
        name: '',
        owner: users[0],
        type: 'private',
      });
      return this.chatRoomRepo.save({ ...r, name: r.cid });
    } else {
      return { ...room[0], messages: room[0].messages.length };
    }
  }

  async searchByname(name: string): Promise<ChatRoom[]> {
    name = name ? name.trim() : '%%';
    const chatrooms: ChatRoom[] = await this.chatRoomRepo
      .createQueryBuilder('chatroom')
      .where('chatroom.name LIKE :s', { s: `%${name}%` })
      .getMany();
    return chatrooms.filter((c) => c.type === 'public');
  }

  async joinRoomAsMember(userId: string, cid: string, password: string) {
    const user: User = await this.userRepo.findOne({ where: { uid: userId } });

    if (!user) throw new ForbiddenException();

    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members', 'banned'],
    });
    if (
      !chatRoom ||
      (!(chatRoom.type === 'protected') && !(chatRoom.type === 'public'))
    )
      throw new ForbiddenException();

    if (chatRoom.banned.find((u) => u.uid == userId))
      throw new ForbiddenException();

    if (chatRoom.type === 'protected') {
      const isMatch = await await bcrypt.compare(password, chatRoom.password);
      if (!isMatch) throw new ForbiddenException('Wrong Password !!');
    }
    chatRoom.members = [...chatRoom.members, user];
    await this.chatRoomRepo.save(chatRoom);
    this.chatGateway.emitConvsRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'add',
    );
    this.chatGateway.emitChatRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'add',
    );
    // await this.chatRoomRepo.update(cid, {
    //   members: [...chatRoom.members, user],
    // });
  }

  async deleteRoom(uid: string, cid: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members'],
    });
    if (!chatRoom || chatRoom.owner !== uid) throw new ForbiddenException();
    this.chatGateway.emitConvsRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'remove', // just refreshing here
      '',
    );
    this.chatGateway.emitChatRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'remove', // just refreshing
      '*',
    );
    await this.chatRoomRepo.delete(cid);
  }

  async updateRoomPass(
    uid: string,
    data: { cid: string; oldPass: string; newPass: string },
  ) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid: data.cid,
      },
      relations: ['admins'],
    });
    if (!chatRoom) throw new UnauthorizedException();
    if (chatRoom.owner == uid || chatRoom.admins.find((ad) => ad.uid == uid)) {
      const roomPass = await bcrypt.hash(data.newPass, 10);
      if (chatRoom.type == 'public') {
        // create new password
        await this.chatRoomRepo.save({
          ...chatRoom,
          password: roomPass,
          type: 'protected',
        });
        this.chatGateway.emitChatRefreshRequest(
          [...chatRoom.admins.map((u: User) => u.uid), chatRoom.owner],
          chatRoom.cid,
          'add', // just refreshing
        );
      } else if (chatRoom.type == 'privategroup') {
        throw new ForbiddenException("can't update private room");
      } else {
        // if old pass if valid update
        if (await bcrypt.compare(data.oldPass, chatRoom.password)) {
          await this.chatRoomRepo.save({
            ...chatRoom,
            password: roomPass,
          });
          this.chatGateway.emitChatRefreshRequest(
            [...chatRoom.admins.map((u: User) => u.uid), chatRoom.owner],
            chatRoom.cid,
            'add', // just refreshing
          );
        } else throw new ForbiddenException('wrong password');
      }
    } else throw new ForbiddenException('you are not admin');
  }

  async deleteRoomPass(uid: string, cid: string, oldPass: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins'],
    });
    if (!chatRoom) throw new UnauthorizedException();
    if (chatRoom.owner == uid || chatRoom.admins.find((ad) => ad.uid == uid)) {
      if (chatRoom.type != 'protected') {
        throw new ForbiddenException('not a protected room');
      }
      const isMatch = await bcrypt.compare(oldPass, chatRoom.password);
      if (!isMatch) throw new ForbiddenException('Wrong Password !!');
      await this.chatRoomRepo.save({
        password: null,
        type: 'public',
      });
      this.chatGateway.emitChatRefreshRequest(
        [...chatRoom.admins.map((u: User) => u.uid), chatRoom.owner],
        chatRoom.cid,
        'add', // just refreshing
      );
    }
    throw new ForbiddenException('you are not admin');
  }

  async setAdmin(uid: string, cid: string, newadmin: string): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'members'],
    });

    if (!chatRoom) throw new UnauthorizedException();
    if (
      chatRoom.admins.find((admin) => {
        return admin.uid === newadmin;
      })
    )
      return new Error(' User is Already an Admin');
    if (
      chatRoom.owner === uid ||
      chatRoom.admins.find((admin) => {
        return admin.uid === uid;
      })
    ) {
      // await this.chatRoomRepo.update(cid, {
      //   admins: [
      //     ...chatRoom.admins,
      //     await this.userRepo.findOne({ where: { uid: newadmin } }),
      //   ],
      // });
      await this.chatRoomRepo.save({
        ...chatRoom,
        admins: [
          ...chatRoom.admins,
          await this.userRepo.findOne({ where: { uid: newadmin } }),
        ],
      });
      // this.chatGateway.emitConvsRefreshRequest(
      //   chatRoom.members.map((u: User) => u.uid),
      //   chatRoom.cid,
      //   'add', // just refreshing here
      // );
      this.chatGateway.emitChatRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'add', // just refreshing
      );
    } else {
      return new UnauthorizedException();
    }
  }
  async removeAdmin(
    uid: string,
    cid: string,
    deletedAdmin: string,
  ): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'members'],
    });

    if (!chatRoom) throw new UnauthorizedException();
    if (
      !chatRoom.admins.find((admin) => {
        return admin.uid === deletedAdmin;
      })
    )
      return new UnauthorizedException(); // not an admin
    if (
      chatRoom.owner === uid ||
      chatRoom.admins.find((admin) => {
        return admin.uid === uid;
      })
    ) {
      // await this.chatRoomRepo.update(cid, {
      //   admins: [
      //     ...chatRoom.admins,
      //     await this.userRepo.findOne({ where: { uid: deletedAdmin } }),
      //   ],
      // });
      await this.chatRoomRepo.save({
        ...chatRoom,
        admins: [...chatRoom.admins.filter((ad) => ad.uid != deletedAdmin)],
      });
      // this.chatGateway.emitConvsRefreshRequest(
      //   chatRoom.members.map((u: User) => u.uid),
      //   chatRoom.cid,
      //   'add', // just refreshing here
      // );
      this.chatGateway.emitChatRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'add', // just refreshing
      );
    } else {
      return new UnauthorizedException();
    }
  }

  async setMembers(uid: string, cid: string, members: string[]): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'members', 'banned'],
    });

    function notMember(member: User): boolean {
      const found = chatRoom.members.find((m) => member.uid == m.uid);
      return !found;
    }
    function notBanned(member: User): boolean {
      const banned = chatRoom?.banned.find((m) => member.uid == m.uid);
      return !banned;
    }

    if (!chatRoom) throw new UnauthorizedException();

    const admin = chatRoom.admins.find((admin) => {
      return admin.uid === uid;
    });
    if (admin || chatRoom.owner == uid) {
      let newMembers = await Promise.all(
        members.map(async (m) => {
          return await this.userRepo.findOne({ where: { uid: m } });
        }),
      );
      const newMembersOnly = newMembers;
      newMembers = newMembers.filter(notMember);
      newMembers = newMembers.filter(notBanned);
      newMembers = [...chatRoom.members, ...newMembers];
      await this.chatRoomRepo.save({
        ...chatRoom,
        members: newMembers,
      });
      this.chatGateway.emitConvsRefreshRequest(
        newMembers.map((u: User) => u.uid),
        chatRoom.cid,
        'add',
      );
      this.chatGateway.emitChatRefreshRequest(
        newMembers.map((u: User) => u.uid),
        chatRoom.cid,
        'add',
      );
      // notification

      newMembersOnly.map((u: User) => {
        if (u.uid == chatRoom.owner) return;
        const senderUsername = chatRoom.members.find(
          (u) => uid == u.uid,
        ).username;
        this.chatGateway.emitNotification('joinedRoom', senderUsername, u.uid, {
          cid: chatRoom.cid,
          name: chatRoom.name,
        });
        this.notifService.createNotification(
          u.uid,
          JSON.stringify({
            type: 'joinedRoom',
            sender: senderUsername,
            room: { cid: chatRoom.cid, name: chatRoom.name },
          }),
        );
      });
    }
    return new ForbiddenException();
  }

  async removeMember(
    uid: string,
    cid: string,
    deletedMember: string,
  ): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'members'],
    });

    if (!chatRoom) throw new UnauthorizedException();

    const admin = chatRoom.admins.find((admin) => {
      return admin.uid === uid;
    });
    const deletedUserAdmin = chatRoom.admins.find((admin) => {
      return admin.uid === deletedMember;
    });
    // if owner || ( user is admin and todelete is not owner and not admin )
    if (
      chatRoom.owner == uid ||
      (admin && !deletedUserAdmin && !(chatRoom.owner == deletedMember))
    ) {
      const r = await this.chatRoomRepo.save({
        ...chatRoom,
        members: [...chatRoom.members.filter((m) => m.uid != deletedMember)],
        admins: [...chatRoom.admins.filter((m) => m.uid != deletedMember)],
      });
      this.chatGateway.emitConvsRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'remove',
        deletedMember,
      );
      this.chatGateway.emitChatRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'remove',
        deletedMember,
      );
    }
    return new ForbiddenException();
  }

  async leaveRoom(uid: string, cid: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members', 'admins'],
    });
    if (!chatRoom) throw new NotFoundException('chat room not found');

    if (chatRoom.owner != uid) {
      this.chatGateway.emitConvsRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'remove',
        uid,
      );
      this.chatGateway.emitChatRefreshRequest(
        chatRoom.members.map((u: User) => u.uid),
        chatRoom.cid,
        'remove',
        uid,
      );
      return await this.chatRoomRepo.save({
        ...chatRoom,
        members: chatRoom.members.filter((mem) => mem.uid != uid),
        admins: chatRoom.admins.filter((ad) => ad.uid != uid),
      });
    }
    const updatedRoom = {
      ...chatRoom,
      members: [...chatRoom.members.filter((mem) => mem.uid != uid)],
      admins: [...chatRoom.admins.filter((ad) => ad.uid != uid)],
    };

    let newOwner = updatedRoom.admins[0];
    if (!newOwner) newOwner = updatedRoom.members[0];
    if (!newOwner) {
      return await this.deleteRoom(uid, cid);
    }

    await this.chatRoomRepo.save({
      ...updatedRoom,
      owner: newOwner.uid,
    });
    this.chatGateway.emitConvsRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'remove',
      uid,
    );
    this.chatGateway.emitChatRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      chatRoom.cid,
      'remove',
      uid,
    );
  }

  async ban(userId: string, cid: string, banned: string): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'banned', 'members'],
    });

    if (!chatRoom) throw new BadRequestException();

    if (
      //if not admin and not owner
      !chatRoom.admins.find((u) => u.uid == userId) &&
      chatRoom.owner != userId
    )
      throw new UnauthorizedException('not admin');

    if (chatRoom.banned.find((u) => u.uid == banned))
      // already banned
      throw new BadRequestException('already banned');

    const r = await this.chatRoomRepo.save({
      ...chatRoom,
      members: chatRoom.members.filter((u) => u.uid != banned),
      admins: chatRoom.admins.filter((u) => u.uid != banned),
      banned: [
        ...chatRoom.banned,
        await this.userRepo.findOneOrFail({ where: { uid: banned } }),
      ],
    });
    this.chatGateway.emitConvsRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      r.cid,
      'remove', // just refreshing here
      banned,
    );
    this.chatGateway.emitChatRefreshRequest(
      chatRoom.members.map((u: User) => u.uid),
      r.cid,
      'remove', // just refreshing
      banned,
    );
  }
  async mute(
    userId: string,
    uid: string,
    cid: string,
    minutes: number,
  ): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'members'],
    });

    if (!chatRoom) throw new BadRequestException();

    if (
      //if not admin and not owner
      !chatRoom.admins.find((u) => u.uid == userId) &&
      chatRoom.owner != userId
    )
      throw new UnauthorizedException('not admin');

    const mutedUntil = await this.muteService.getUserMute(uid, cid);
    if (mutedUntil < Date.now()) {
      await this.muteService.muteUser(uid, cid, minutes);
      this.chatGateway.emitChatRefreshRequest(
        [uid],
        cid,
        'add', // just refreshing
        uid,
      );
      return;
    } else {
      throw new BadRequestException('already muted');
    }
  }
  async create(createChatDto: createChatMessageDto): Promise<ChatMessage> {
    return await this.chatMessageRepo.save(
      this.chatMessageRepo.create(createChatDto),
    );
  }

  async createRoom(
    createChatRoom: createChatRoomDto,
  ): Promise<createChatRoomDto> {
    if (createChatRoom.type === 'protected' && !createChatRoom.password)
      throw new ForbiddenException();
    else if (createChatRoom.type === 'protected' && createChatRoom.password)
      createChatRoom.password = await bcrypt.hash(createChatRoom.password, 10);

    // createChatRoom.members.push(createChatRoom['owner']);

    if (createChatRoom.name === null)
      createChatRoom.name = Math.random().toString(36);
    try {
      const r = await this.chatRoomRepo.save(createChatRoom);
      // this.chatRoomRepo.create(createChatRoom);
      this.chatGateway.emitConvsRefreshRequest(
        r.members.map((u: User) => u.uid),
        r.cid,
        'add',
      );
      this.chatGateway.emitChatRefreshRequest(
        r.members.map((u: User) => u.uid),
        r.cid,
        'add',
      );
      // notification

      r.members.map((u: User) => {
        if (u.uid == r.owner) return;
        const senderUsername = r.members.find((u) => r.owner == u.uid).username;
        this.chatGateway.emitNotification('joinedRoom', senderUsername, u.uid, {
          cid: r.cid,
          name: r.name,
        });
        this.notifService.createNotification(
          u.uid,
          JSON.stringify({
            type: 'joinedRoom',
            sender: senderUsername,
            room: { cid: r.cid, name: r.name },
          }),
        );
      });

      return r;
    } catch (e) {
      throw new BadRequestException('name already used');
    }
  }

  async findAll(): Promise<ChatMessage[]> {
    return await this.chatMessageRepo.find({ relations: ['ownerId'] });
    // return `This action returns all chat`;
  }

  async getMessagingRooms(uid: string) {
    const chatRooms: ChatRoom[] = await this.chatRoomRepo.find({
      relations: ['members', 'messages'],
    });
    let result = [];

    const blockedByList = await this.userService.getUserBlockedByList(uid);
    const blockList = await this.userService.getUserBlockList(uid);

    chatRooms.map((chatroom) => {
      if (chatroom.name.includes('GAME_') || chatroom.name == 'public') return;
      for (const user of chatroom.members) {
        if (user.uid === uid) {
          // add check here to hide public room from convs list
          if (
            chatroom.type == 'private' &&
            chatroom.members.find(
              (u: User) =>
                (u.uid != uid && blockedByList.find((b) => b.uid == u.uid)) ||
                blockList.find((b) => b.uid == u.uid),
            )
          )
            break;
          result.push(chatroom);
          break;
        }
      }
    });

    result = await Promise.all(
      result.map(async (chatRoom) => {
        return {
          cid: chatRoom.cid,
          name: chatRoom.type === 'private' ? 'noname' : chatRoom.name,
          owner: await this.userService.findOne(chatRoom.owner), // get User for database
          admins: chatRoom.admins,
          members: chatRoom.members,
          description: chatRoom.description,
          type: chatRoom.type,
          messages: chatRoom.messages.length,
          lastMessageTimestamp: chatRoom.messages.at(0)?.createdAt || 0,
        };
      }),
    );

    return result.sort((a, b) => {
      return (
        new Date(b.lastMessageTimestamp).getTime() -
        new Date(a.lastMessageTimestamp).getTime()
      );
    });
  }

  async findAllRooms(uid: string) {
    const chatRooms: ChatRoom[] = await this.chatRoomRepo.find({
      where: [
        {
          type: 'public',
        },
        {
          type: 'protected',
        },
      ],
      relations: ['members', 'banned'],
    });
    const result = [];
    chatRooms.map((chatroom) => {
      if (chatroom.name == 'public') return;
      if (chatroom.name.includes('GAME_')) return;
      if (chatroom.banned.find((u) => u.uid == uid)) return;
      result.push(chatroom);
    });
    return await Promise.all(
      result.map(async (chatRoom) => {
        return {
          cid: chatRoom.cid,
          name: chatRoom.name,
          owner: await this.userService.findOne(chatRoom.owner), // get user from database
          admins: chatRoom.admins,
          members: chatRoom.members,
          description: chatRoom.description,
          type: chatRoom.type,
        };
      }),
    );
  }

  async findAllMessages(uid: string, roomName: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: [
        {
          name: roomName,
        },
      ],
      relations: ['messages', 'banned'],
    });

    if (
      chatRoom?.banned &&
      chatRoom?.banned?.find((banUser) => {
        return banUser.uid === uid;
      })
    )
      throw new UnauthorizedException(" User is Banned can't send messages ");

    const messages: Message[] = chatRoom?.messages.map((message) => {
      return {
        text: message.text,
        date: message.createdAt,
        username: message.username,
        ownerId: message.ownerId,
      };
    });
    const blockList = await this.userService.getUserBlockList(uid);


    return messages.filter((m) => {
      return !blockList.find((u: User) => {
        u.uid == m.ownerId;
      });
    });

    return messages;
  }

  async findRoomByName(name: string): Promise<any> {
    return await this.chatRoomRepo.findOne({
      where: { name: name },
      relations: ['members'],
    });
  }

  async findRoomById(cid: string): Promise<any> {
    return await this.chatRoomRepo.findOne({
      where: { cid },
      relations: ['members'],
    });
  }

  async findOne(uid: string, cid: string) {
    try {
      const chat = await this.chatRoomRepo.findOneOrFail({
        where: { cid: cid },
        relations: ['messages', 'admins', 'banned', 'members'],
      });

      if (
        !chat.members.find((u) => u.uid == uid) ||
        chat.banned.find((u) => u.uid == uid)
      )
        throw new UnauthorizedException();
      const blockList = await this.userService.getUserBlockList(uid);
      const blockedByList = await this.userService.getUserBlockedByList(uid);

      if (chat.type == 'private') {
        const other = chat.members.find((u) => uid != u.uid);
        if (blockedByList.find((u) => u.uid == other.uid))
          throw new UnauthorizedException();
        if (blockList.find((u) => u.uid == other.uid))
          throw new UnauthorizedException();
      }

      return {
        ...chat,
        name: chat.type === 'private' ? 'noname' : chat.name,
        owner: await this.userService.findOne(chat.owner),
        mutedUntil: await this.muteService.getUserMute(uid, cid),
        messages: chat.messages.filter((m) => {
          return !blockList.find((u: User) => {
            return u.uid == m.ownerId;
          });
        }),
      };
      // get user from database ?
    } catch (e) {
      throw new NotFoundException('room not found');
    }
  }

  // update(id: number, updateChatDto: UpdateChatDto) {
  //   return `This action updates a #${id} chat`;
  // }

  async remove(id: string): Promise<ChatMessage> {
    const chatMessage: ChatMessage = await this.chatMessageRepo.findOne({
      where: { messageId: id },
    });
    return this.chatMessageRepo.remove(chatMessage);
  }
}
