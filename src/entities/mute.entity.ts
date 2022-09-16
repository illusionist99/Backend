import { Entity } from 'typeorm';
import { PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Mute {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  userId: string;

  @Column({ nullable: false })
  roomId: string;

  @Column({ nullable: false, default: 0, type: 'bigint' })
  mutedUntil: number;
}
