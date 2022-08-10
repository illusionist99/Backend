import { Body, ForbiddenException, Injectable, UploadedFile } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/user.dto';
import { User } from 'src/entities/user.entity';
import * as bcrypt from 'bcrypt';


@Injectable()
export class UserService {


  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    ) {}

    async searchUsers(searchParam: string) : Promise<User[]> {
    

      const users: User[] = await this.userRepo.createQueryBuilder('user').where("user.username LIKE :s", { s: `%${searchParam}%` }).getMany();
      console.log(" users : " , users);
      return users;
    }

    async updateAvatar(uid: string, @UploadedFile() avatar: Express.Multer.File) {

      const user = await  this.findOne(uid);

      if (!user) throw new ForbiddenException();

      return  await this.userRepo.update(user.uid, {picture: avatar.buffer});
    }
    
    async createLocal(username: string, password: string) : Promise<User> {
      
      // 'This action adds a new user';
      
      let newUser = new CreateUserDto;
      
      newUser.username = username;
      newUser.nickname = username;

      const saltOrRounds = 10;
      const hash = await bcrypt.hash(password, saltOrRounds);
      newUser.password = hash;
      newUser.refreshToken = "";
      password = undefined;
      newUser.chatRooms = [];
      newUser.avatar = "https://avatars.dicebear.com/api/bottts/" + newUser.nickname + ".svg";
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
  
    const user = await this.userRepo.findOne({ where: { username }});

    if (user)
      return user;
    return null;
  }

  async findById(uid: string) : Promise<User>{
    // `This action returns a #${id} user`; 
  
    const user = await this.userRepo.findOne({ where: { uid }});

    if (user)
      return user;
    return null;
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
