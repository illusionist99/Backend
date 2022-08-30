import { Entity } from 'typeorm';
import { PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  json: string;

  @Column({ nullable: false, default: false })
  seen: boolean;

  @Column({ nullable: false })
  userId: string;
}

/*

on load:
  - fetch notifications from db
  - if some notifications not seen, set component accordingly (red dot)

on event:
  - add notification to db
  - emit event
  
on seen:
  - user emits when notifs are seen

on clear:
  - user clears notifications via http

*/
