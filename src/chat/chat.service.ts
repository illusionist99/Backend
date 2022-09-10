import { InjectRepository } from '@nestjs/typeorm';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createChatRoomDto } from 'src/dtos/chatRoom.dto';
import { ChatMessage } from 'src/entities/chatMessage.entity';
import { ChatRoom } from 'src/entities/chatRoom.entity';
import { User } from 'src/entities/user.entity';
import { Repository } from 'typeorm';
import { createChatMessageDto } from '../dtos/chatMessage.dto';
import * as bcrypt from 'bcrypt';

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
      const isMatch: boolean = bcrypt.compare(password, chatRoom.password);
      if (!isMatch) return Error('Wrong Password !!');
    }
    chatRoom.members = [...chatRoom.members, user];
    await this.chatRoomRepo.save(chatRoom);

    // await this.chatRoomRepo.update(cid, {
    //   members: [...chatRoom.members, user],
    // });
  }

  async deleteRoom(uid: string, cid: string) {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
    });

    if (!chatRoom || chatRoom.owner !== uid) throw new ForbiddenException();

    await this.chatRoomRepo.delete(cid);
  }

  async setAdmin(uid: string, cid: string, newadmin: string): Promise<any> {
    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['admins'],
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
      relations: ['admins'],
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
    } else {
      return new UnauthorizedException();
    }
  }
  async removeMember(
    uid: string,
    cid: string,
    deletedMember: string,
  ): Promise<any> {
    function isAuth(): boolean {
      if (uid == deletedMember) return true;
      if (chatRoom.owner == uid) {
        return true;
      }
      if (chatRoom.admins.find((ad) => ad.uid == uid)) {
        if (
          deletedMember != chatRoom.owner &&
          !chatRoom.admins.find((ad) => ad.uid == deletedMember)
        )
          return true;
      }
      return false;
    }

    const chatRoom: ChatRoom = await this.chatRoomRepo.findOne({
      where: {
        cid,
      },
      relations: ['members', 'admins'],
    });

    console.log('---->1');
    if (!chatRoom) throw new UnauthorizedException();
    if (
      !chatRoom.members.find((m) => {
        return m.uid === deletedMember;
      })
    )
      return new UnauthorizedException(); // not an admin
    // console.log('---->2', chatRoom);
    if (isAuth()) {
      if (!(uid == deletedMember)) {
      }
      const newOwner = (() => {
        if (deletedMember == chatRoom.owner) {
          if (chatRoom.admins.length) {
            return chatRoom.admins[0].uid;
          } else if (chatRoom.members.length > 1) {
            return chatRoom.members.filter((m) => m.uid != uid)[0].uid;
          } else {
            // delete room
            return false;
          }
        }
        return chatRoom.owner;
      })();
      if (newOwner == false) return this.deleteRoom(uid, cid);
      else {
        await this.chatRoomRepo.save({
          ...chatRoom,
          members: [
            ...chatRoom.members.filter((mem) => mem.uid != deletedMember),
          ],
          admins: [...chatRoom.admins.filter((ad) => ad.uid != deletedMember)],
          owner: newOwner,
        });
      }
    } else {
      return new UnauthorizedException();
    }
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
    // this.chatRoomRepo.create(createChatRoom);

    return await this.chatRoomRepo.save(createChatRoom);
  }

  async findAll(): Promise<ChatMessage[]> {
    return await this.chatMessageRepo.find({ relations: ['ownerId'] });
    // return `This action returns all chat`;
  }

  async getMessagingRooms(uid: string) {
    const chatRooms: ChatRoom[] = await this.chatRoomRepo.find({
      relations: ['members', 'owner', 'messages'],
    });
    // console.log('chat rooms  0', chatRooms);
    let result = [];
    chatRooms.map((chatroom) => {
      for (const id of chatroom.members) {
        if (
          id.uid === uid &&
          !chatroom.name.includes('GAME_') &&
          chatroom.name != 'public'
        ) {
          // add check here to hide public room from convs list
          result.push(chatroom);
          break;
        }
      }
    });
    console.log('result : ', result);

    result = result.map((chatRoom) => {
      console.log(
        'chatroom is null : ',
        chatRoom.type === 'private' ? 'private' : chatRoom.name,
      );

      return {
        cid: chatRoom.cid,
        name: chatRoom.type === 'private' ? 'noname' : chatRoom.name,
        owner: chatRoom.owner,
        admins: chatRoom.admins,
        members: chatRoom.members,
        description: chatRoom.description,
        type: chatRoom.type,
        messages: chatRoom.messages.length,
        lastMessageTimestamp: chatRoom.messages.at(0)?.createdAt || 0,
      };
    });

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
      relations: ['members', 'owner'],
    });
    // console.log('chat rooms  0', chatRooms);
    const result = [];
    // chatRooms.map((chatroom) => {
    //   for (const id of chatroom.members) {
    //     if (id.uid === uid) result.push(chatroom);
    //   }
    // });
    // console.log('result : ', result);
    return chatRooms.map((chatRoom) => {
      return {
        cid: chatRoom.cid,
        name: chatRoom.name,
        owner: chatRoom.owner,
        admins: chatRoom.admins,
        members: chatRoom.members,
        description: chatRoom.description,
        type: chatRoom.type,
      };
    });
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
    return await this.chatRoomRepo.findOne({ where: { name: name } });
  }

  async findRoomById(cid: string): Promise<any> {
    return await this.chatRoomRepo.findOne({ where: { cid } });
  }

  async findOne(id: string): Promise<ChatRoom> {
    const chat = await this.chatRoomRepo.findOne({
      where: { cid: id },
      relations: ['messages', 'admins', 'banned', 'owner', 'members'],
    });
    return { ...chat, name: chat.type === 'private' ? 'noname' : chat.name };
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
