import { Body, ForbiddenException, Injectable, Request, Response, UploadedFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/user.dto';
import { updateUserDto } from '../entities/update.user'
import { User } from 'src/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { friendList } from 'src/entities/friendList.entity';
import { friendListDto } from 'src/dtos/friendList.dto';

@Injectable()
export class UserService {


  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(friendList)
    private friendListRepo: Repository<friendList>
    ) {}


    async getFriends(@Request() req) : Promise<friendList[]> {
    
      const uid = req.user.uid;
      return await this.friendListRepo.find({
        where: [
          {
            status: true,
            blocked: false,
            recieverUid: uid,
          },
          {
            status: true,
            blocked: false,
            senderUid: uid,
          }
        ]
      })
    }

    async sendFriendInvite(@Request() req, @Body() payload: any) : Promise<friendList> {
    
      let newFriendRequest : friendListDto = new friendListDto;

      newFriendRequest.senderUid = req.user.uid;
      newFriendRequest.recieverUid = payload['ruid'];
      newFriendRequest.status = false;
      this.friendListRepo.create(newFriendRequest);
      return await this.friendListRepo.save(newFriendRequest);
    }

    async UpdateFriendInvite(uid: string, status: boolean) : Promise<any> {
    
      const friendship = await this.friendListRepo.findOne({
        where: {
          uid: uid,
        }
      });

      if (!friendship) throw new ForbiddenException();

      return await this.friendListRepo.update(uid, {
        status: status,
      })
       
      // return 
    }

    async updateAvatar(uid: string, @UploadedFile() avatar: Express.Multer.File) {

      const user = await  this.findOne(uid);

      if (!user) throw new ForbiddenException();

      return  await this.userRepo.update(user.uid, {picture: avatar.buffer});
    }
    
    async createLocal(username: string, password: string) : Promise<User> {
      
      // 'This action adds a new user';
      
      let newUser = new CreateUserDto;
      
      newUser.login = username;
      newUser.displayedName = username;

      const saltOrRounds = 10;
      const hash = await bcrypt.hash(password, saltOrRounds);
      newUser.password = hash;
      newUser.refreshToken = "";
      password = undefined;
      newUser.chatRooms = [];
      // createUserDto.password = bycrypt
      // console.log(newUser, username, password);
      // this.userRepo.create(newUser);
      return await this.userRepo.save(newUser);
    }

    async create(createUserDto: CreateUserDto) : Promise<User> {
      
      // 'This action adds a new user';
      createUserDto.chatRooms = [];
      const saltOrRounds = 10;
      const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);
      createUserDto.password = hash;
      createUserDto.refreshToken = "";
      this.userRepo.create(createUserDto);
      return await this.userRepo.save(createUserDto);
    }
    
  //   async findAll() : Promise<User> {
  //   // 'This action returns all user`;
  //    const user = await this.user
  //   return await this.userRepo.find();
  // }

  async findOne(id: string) : Promise<User>{
    // `This action returns a #${id} user`; 
  
    const user = await this.userRepo.findOne({ where: { uid: id }});

    delete user.password;
    delete user.refreshToken;

    if (user)
      return user;
    return null;
  }

  async findByUsername(username: string) : Promise<User>{
    // `This action returns a #${id} user`; 
  
    const user = await this.userRepo.findOne({ where: { login: username }});

    if (user)
      return user;
    return null;
  }


  async update(id: string, updateUserDto: updateUserDto) {
  
    const user = await this.userRepo.find({where: {
      uid: id,
    }})

    let updated = Object.assign(updateUserDto, user);
    return await this.userRepo.save(updated);
  }

  async updateRt(uid: string, hash: string) {
  
    const user = await this.userRepo.findOne({where: {uid}});

    if (!user) throw new ForbiddenException();
  
    return this.userRepo.update(user.uid, {
      refreshToken: hash,
    });
  }

  async remove(id: string) : Promise<User> {
    // `This action removes a #${id} user`;
  
    const user = await this.userRepo.findOne({ where: { uid: id }});

    if (user)
    {
      return await this.userRepo.remove(user);
    }
    
    return null;
  }
}
