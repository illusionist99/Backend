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
          // console.log("filtering members", m.uid,(friendRequest.sender), (friendRequest.receiver))
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
      relations: ['members'],
    });
    if (
      !chatRoom ||
      (!(chatRoom.type === 'protected') && !(chatRoom.type === 'public'))
    )
      throw new ForbiddenException();
    if (chatRoom.type === 'protected') {
      console.log('passord --> ', password, chatRoom.password);
      const isMatch = await await bcrypt.compare(password, chatRoom.password);
      console.log('does password match ? ', isMatch);
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
    console.log('cid', cid, uid);
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members'],
    });
    console.log(' chat room ', chatRoom);
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
        return await this.chatRoomRepo.save({
          ...chatRoom,
          password: roomPass,
          type: 'protected',
        });
      } else if (chatRoom.type == 'privategroup') {
        throw new ForbiddenException("can't update private room");
      } else {
        // if old pass if valid update
        if (await bcrypt.compare(data.oldPass, chatRoom.password)) {
          return await this.chatRoomRepo.save({
            ...chatRoom,
            password: roomPass,
            type: 'public',
          });
        } else throw new ForbiddenException('wrong password');
      }
    }
    throw new ForbiddenException('you are not admin');
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
      console.log('passes to compare', oldPass, chatRoom.password);
      const isMatch = await bcrypt.compare(oldPass, chatRoom.password);
      if (!isMatch) throw new ForbiddenException('Wrong Password !!');
      return await this.chatRoomRepo.save({
        ...chatRoom,
        password: null,
        type: 'public',
      });
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

    console.log('---->1');
    if (!chatRoom) throw new UnauthorizedException();
    if (
      chatRoom.admins.find((admin) => {
        return admin.uid === newadmin;
      })
    )
      return new Error(' User is Already an Admin');
    console.log('---->2');
    if (
      chatRoom.owner === uid ||
      chatRoom.admins.find((admin) => {
        return admin.uid === uid;
      })
    ) {
      // console.log('---->3', chatRoom.admins);
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

    console.log('---->1');
    if (!chatRoom) throw new UnauthorizedException();
    if (
      !chatRoom.admins.find((admin) => {
        return admin.uid === deletedAdmin;
      })
    )
      return new UnauthorizedException(); // not an admin
    console.log('---->2');
    if (
      chatRoom.owner === uid ||
      chatRoom.admins.find((admin) => {
        return admin.uid === uid;
      })
    ) {
      // console.log('---->3', chatRoom.admins);
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
      relations: ['admins', 'members'],
    });

    function notMember(member: User): boolean {
      const found = chatRoom.members.find((m) => member.uid == m.uid);
      console.log('!!!!', !!found, found, member);
      return !found;
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
      newMembers = newMembers.filter(notMember);
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
    console.log('-----> leave roooom');
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members', 'admins'],
    });
    if (!chatRoom) throw new NotFoundException('chat room not found');
    console.log('-----> leave roooom 2');

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
    console.log('leaving member is owner------>');
    const updatedRoom = {
      ...chatRoom,
      members: [...chatRoom.members.filter((mem) => mem.uid != uid)],
      admins: [...chatRoom.admins.filter((ad) => ad.uid != uid)],
    };
    console.log('updated rooom', updatedRoom);

    let newOwner = updatedRoom.admins[0];
    if (!newOwner) newOwner = updatedRoom.members[0];
    if (!newOwner) {
      return await this.deleteRoom(uid, cid);
    }

    console.log('new owner', newOwner, updatedRoom);
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

  async ban(uid: string, cid: string, banned: string): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins', 'banned', 'members'],
    });

    if (!chatRoom) throw new UnauthorizedException();
    if (
      chatRoom.admins.find((admin) => {
        return admin.uid === banned;
      }) &&
      uid != chatRoom.owner
    )
      return new Error(" Can't Ban An Admin Only By Owner");
    if (
      chatRoom.owner === uid ||
      (chatRoom.admins.map((admin) => {
        return admin.uid === uid;
      }) &&
        chatRoom.members.map((member) => {
          member.uid === banned;
        }))
    ) {
      await this.chatRoomRepo.update(cid, {
        members: chatRoom.members.filter((member) => {
          return member.uid === banned;
        }),
        banned: [
          ...chatRoom.banned,
          await this.userRepo.findOne({ where: { uid: banned } }),
        ],
        admins: chatRoom.admins.filter((admin) => {
          return admin.uid === banned;
        }),
      });
    }
  }

  async create(createChatDto: createChatMessageDto): Promise<ChatMessage> {
    console.log('->>', createChatDto);
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
    console.log('creation ', createChatRoom);
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
      return r;
    } catch (e) {
      throw new BadRequestException();
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
    // console.log('chat rooms  0', chatRooms);
    let result = [];
    chatRooms.map((chatroom) => {
      if (chatroom.name.includes('GAME_') || chatroom.name == 'public') return;
      for (const id of chatroom.members) {
        if (id.uid === uid) {
          // add check here to hide public room from convs list
          result.push(chatroom);
          break;
        }
      }
    });
    console.log('result : ', result);

    result = await Promise.all(
      result.map(async (chatRoom) => {
        console.log(
          'chatroom is null : ',
          chatRoom.type === 'private' ? 'private' : chatRoom.name,
        );

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
      relations: ['members'],
    });
    // console.log('chat rooms  0', chatRooms);
    const result = [];
    chatRooms.map((chatroom) => {
      if (chatroom.name == 'public') return;
      // for (const id of chatroom.members) {
      //   if (id.uid === uid) result.push(chatroom);
      // }
      // ? i don't why this filter this function is used by chat/rooms route
      result.push(chatroom);
    });
    console.log('result : ', result);
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
    // console.log(' looking for messages in Room Name ', roomName);
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: [
        {
          name: roomName,
        },
      ],
      relations: ['messages', 'banned'],
    });
    // console.log(' looking for messages in Room Name ', chatRoom);

    if (
      chatRoom?.banned &&
      chatRoom?.banned?.find((banUser) => {
        return banUser.uid === uid;
      })
    )
      return new Error(" User is Banned can't send messages ");

    const Messages: Message[] = chatRoom?.messages.map((message) => {
      return {
        text: message.text,
        date: message.createdAt,
        username: message.username,
        ownerId: message.ownerId,
      };
    });
    // console.log('messages', chatRoom.messages);

    return Messages;
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

  async findOne(id: string) {
    try {
      const chat = await this.chatRoomRepo.findOneOrFail({
        where: { cid: id },
        relations: ['messages', 'admins', 'banned', 'members'],
      });
      return {
        ...chat,
        name: chat.type === 'private' ? 'noname' : chat.name,
        owner: await this.userService.findOne(chat.owner),
      };
      // get user from database ?
    } catch {
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
