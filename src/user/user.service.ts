import {
  Body,
  ForbiddenException,
  Injectable,
  UploadedFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dtos/user.dto';
import { updateUserDto } from '../entities/update.user';
import { User } from 'src/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async updateAvatar(uid: string, @UploadedFile() avatar: Express.Multer.File) {
    const user = await this.findOne(uid);

    if (!user) throw new ForbiddenException();

    return await this.userRepo.update(user.uid, { picture: avatar.buffer });
  }

  async createLocal(username: string, password: string): Promise<User> {
    // 'This action adds a new user';

    let newUser = new CreateUserDto();

    newUser.username = username;
    newUser.nickname = username;

    const saltOrRounds = 10;
    const hash = await bcrypt.hash(password, saltOrRounds);
    newUser.password = hash;
    newUser.refreshToken = '';
    password = undefined;
    newUser.chatRooms = [];
    newUser.avatar =
      'https://avatars.dicebear.com/api/bottts/' + newUser.nickname + '.svg';
    // createUserDto.password = bycrypt
    // console.log(newUser, username, password);
    // this.userRepo.create(newUser);
    return await this.userRepo.save(newUser);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // 'This action adds a new user';
    createUserDto.chatRooms = [];
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);
    createUserDto.password = hash;
    createUserDto.refreshToken = '';
    this.userRepo.create(createUserDto);
    return await this.userRepo.save(createUserDto);
  }

  //   async findAll() : Promise<User> {
  //   // 'This action returns all user`;
  //    const user = await this.user
  //   return await this.userRepo.find();
  // }

  async findOne(id: string): Promise<User> {
    // `This action returns a #${id} user`;

    const user = await this.userRepo.findOne({ where: { uid: id } });

    delete user.password;
    delete user.refreshToken;

    if (user) return user;
    return null;
  }

  async findByUsername(username: string): Promise<User> {
    // `This action returns a #${id} user`;

    const user = await this.userRepo.findOne({ where: { username } });

    if (user) return user;
    return null;
  }

  async findById(uid: string): Promise<User> {
    // `This action returns a #${id} user`;

    const user = await this.userRepo.findOne({ where: { uid } });

    if (user) return user;
    return null;
  }

  async update(id: string, updateUserDto: updateUserDto) {
    const user = await this.userRepo.find({
      where: {
        uid: id,
      },
    });

    let updated = Object.assign(updateUserDto, user);
    return await this.userRepo.save(updated);
  }

  async updateRt(uid: string, hash: string) {
    const user = await this.userRepo.findOne({ where: { uid } });

    if (!user) throw new ForbiddenException();

    return this.userRepo.update(user.uid, {
      refreshToken: hash,
    });
  }

  async remove(id: string): Promise<User> {
    // `This action removes a #${id} user`;

    const user = await this.userRepo.findOne({ where: { uid: id } });

    if (user) {
      return await this.userRepo.remove(user);
    }

    return null;
  }
  async setStatus(
    id: string,
    userStatus: 'online' | 'offline' | 'playing' | 'spectating',
  ) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, status: userStatus };
    return this.userRepo.save(user);
  }
  async incrementWins(id: string) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, wins: user.wins + 1 };
    console.log('incrementing wins');
    return this.userRepo.save(user);
  }
  async incrementLosses(id: string) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, losses: user.losses + 1 };
    console.log('incrementing losses');

    return this.userRepo.save(user);
  }
  async incrementXp(id: string, amount: number) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, xp: user.xp + amount };
    console.log('incrementing xp');

    return this.userRepo.save(user);
  }
  async incrementLevel(id: string) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, level: user.level };
    console.log('incrementing level');

    return this.userRepo.save(user);
  }
}
