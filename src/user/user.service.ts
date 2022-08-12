import {
  Body,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UploadedFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeLevelColumn } from 'typeorm';
import { CreateUserDto } from '../dtos/user.dto';
import { UpdateUserDto } from '../dtos/user.dto';
import { User } from 'src/entities/user.entity';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import * as otplib from 'otplib';
import { authenticator } from 'otplib';
import { friendsRequest } from 'src/entities/friendRequest.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(friendsRequest)
    private friendRepo: Repository<friendsRequest>,
  ) {}

  public lvlFactor: number = 40;

  async findOneFriendRequest(sender: string, receiver: string) {
    return await this.friendRepo.findOne({
      where: [
        {
          sender,
          receiver,
        },
        {
          sender: receiver,
          receiver: sender,
        },
      ],
    });
  }

  async ValidateTfa(code: string, secret: string): Promise<Boolean> {
    console.log('validatinng ', code, secret);
    return authenticator.verify({ token: code, secret });
  }

  async EnableTfa(uid: string) {
    const user = await this.userRepo.findOne({ where: { uid } });

    if (!user) throw new ForbiddenException();

    return await this.userRepo.update(user.uid, {
      tfaEnabled: true,
    });
  }


  async generateTFAsecret(user: User) {
    const secret = otplib.authenticator.generateSecret();

    const otpauthUrl = otplib.authenticator.keyuri(
      user.email,
      'Coolest Pong',
      secret,
    );

    this.updateMfaKey(user.uid, secret);

    return {
      secret,
      otpauthUrl,
    };
  }

  async updateMfaKey(uid: string, secret: string) {
    const user = await this.userRepo.findOne({ where: { uid } });

    if (!user) throw new ForbiddenException();

    return this.userRepo.update(user.uid, {
      tfaSecret: secret,
    });
  }

  async searchUsers(uid: string, searchParam: string): Promise<User[]> {
    const users: User[] = await this.userRepo
      .createQueryBuilder('user')
      .where('user.username LIKE :s', { s: `%${searchParam}%` })
      .getMany();
    console.log(' users : ', users);
    if (users.length !== 0) return users.filter((u) => u.uid != uid);

    console.log('procceding to get random users if any ');
    const defaults: User[] = (await this.userRepo.find({ take: 10 })).sort();
    return defaults.filter((u) => u.uid != uid);
  }

  async updateAvatar(uid: string, @UploadedFile() avatar: Express.Multer.File) {
    const user = await this.findOne(uid);

    if (!user) throw new ForbiddenException();

    return await this.userRepo.update(user.uid, { picture: avatar.buffer });
  }

  async createLocal(username: string, password: string): Promise<User> {
    // 'This action adds a new user';

    const newUser = new CreateUserDto();

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

    if (user)
      return {
        ...user,
        xp:
          user.level * this.lvlFactor -
          (((user.level * (user.level + 1)) / 2) * this.lvlFactor - user.xp),
      };
    return null;
  }

  async findByUsername(username: string): Promise<User> {
    // `This action returns a #${id} user`;

    const user = await this.userRepo.findOne({ where: { username } });
    if (user) {
      return {
        ...user,
        xp:
          user.level * this.lvlFactor -
          (((user.level * (user.level + 1)) / 2) * this.lvlFactor - user.xp),
      };
    }
    return null;
  }

  async findById(uid: string): Promise<User> {
    // `This action returns a #${id} user`;

    const user = await this.userRepo.findOne({ where: { uid } });

    if (user)
      return {
        ...user,
        xp:
          user.level * this.lvlFactor -
          (((user.level * (user.level + 1)) / 2) * this.lvlFactor - user.xp),
      };
    return null;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
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

    // await this.incrementLevel(winner);
    user = { ...user, xp: user.xp + amount };

    console.log('incrementing xp');

    let lvlFactor = this.lvlFactor;

    let xpNeededForLevel = user.level * lvlFactor;
    let TotalXpNeeded = ((user.level * (user.level + 1)) / 2) * lvlFactor; // lvl 4 / xpneededforlevel = 400 / currentxp = 440
    let currentXp = user.xp;

    console.log({ xpNeededForLevel, TotalXpNeeded, currentXp });

    while (currentXp >= TotalXpNeeded) {
      user.level++;

      xpNeededForLevel = user.level * lvlFactor;
      TotalXpNeeded = ((user.level * (user.level + 1)) / 2) * lvlFactor; // lvl 4 / xpneededforlevel = 400 / currentxp = 440
      currentXp = user.xp;
      console.log('level Up ');
    }
    return this.userRepo.save(user);
  }
  async incrementLevel(id: string) {
    let user = await this.userRepo.findOne({ where: { uid: id } });
    user = { ...user, level: user.level };
    console.log('incrementing level');

    return this.userRepo.save(user);
  }

  async leaderboard() {
    return this.userRepo
      .find()
      .then((e) => e.sort((a, b) => b.level - a.level));
  }
}
