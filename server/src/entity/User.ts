import { Field, Int, ObjectType } from 'type-graphql';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BaseEntity,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Image } from './Image';
import { Schedule } from './Schedule';
import { Language } from './Language';
import { UserService } from './UserService';
import { TypeormLoader } from 'type-graphql-dataloader';

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true, default: false })
  fake: boolean;

  @Field(() => String, { nullable: true })
  @Column({ default: 'guest', nullable: true })
  type: 'guest' | 'user' | string;

  @Field()
  @Column()
  username: string;

  @Field()
  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description: string;

  @Field({ nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  age: Date;

  @Field({ nullable: true })
  @Column({ nullable: true })
  gender: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  country: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  discord: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  twitter: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  facebook: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  snapchat: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  instagram: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  twitch: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  steam: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  tiktok: string;

  // Language
  @OneToMany(() => Language, (language) => language.user)
  @Field(() => [Language], { nullable: true })
  @TypeormLoader()
  languages: Language[];

  // Image
  @OneToMany(() => Image, (image) => image.user)
  @Field(() => [Image], { nullable: true })
  @TypeormLoader()
  images: Image[];

  // UserGame
  @OneToMany(() => UserService, (userService) => userService.user)
  @Field(() => [UserService], { nullable: true })
  @TypeormLoader()
  services: UserService[];

  // Schedule
  @OneToMany(() => Schedule, (schedule) => schedule.user)
  @Field(() => [Schedule], { nullable: true })
  @TypeormLoader()
  schedules: Schedule[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ nullable: true })
  resetToken: string;
}
