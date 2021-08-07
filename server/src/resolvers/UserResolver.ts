import { User } from '../entity/User';
import { Session } from '../entity/Session';
import {
  Arg,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import argon2 from 'argon2';
import { getConnection, getRepository } from 'typeorm';
import { MyContext } from '../utils/types/MyContext';
import { COOKIE_NAME } from '../constants';
import { validateRegister } from '../utils/validateRegister';
import { sendEmail } from '../utils/sendEmail';
import { v4 } from 'uuid';
import { log } from 'console';
import { isAuth } from '../middleware/isAuth';
import { Language } from '../entity/Language';
import { Image } from '../entity/Image';
import {
  EmailUsernamePasswordInput,
  UpdatedUser,
  UserResponse,
} from '../utils/types/UserTypes';
import { Schedule } from '../entity/Schedule';

@Resolver(User)
export class UserResolver {
  @FieldResolver(() => [Image], { nullable: true })
  images(@Root() user: User, @Ctx() { imageLoader }: MyContext) {
    return imageLoader.load({ userId: user.id });
  }

  @FieldResolver(() => [Language], { nullable: true })
  languages(@Root() user: User, @Ctx() { languageLoader }: MyContext) {
    return languageLoader.load({ userId: user.id });
  }

  @FieldResolver(() => [Schedule], { nullable: true })
  schedules(@Root() user: User, @Ctx() { scheduleLoader }: MyContext) {
    return scheduleLoader.load({ userId: user.id });
  }


  
  @Query(() => [User], { nullable: true })
  getAll() {
    return User.find();
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() { req }: MyContext) {
    // you are not logged in
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  @Mutation(() => User, { nullable: true })
  @UseMiddleware(isAuth)
  async updateMe(
    @Arg('options') options: UpdatedUser,
    @Ctx() { req }: MyContext
  ): Promise<User | null> {
    const { userId }: { userId: number } = req.session;
    const user = await User.findOne(userId);

    if (!user) {
      return null;
    }

    if (options.username) {
      user.username = options.username;
    }
    if (options.description) {
      user.description = options.description;
    }
    if (options.age) {
      user.age = options.age;
    }
    if (options.gender) {
      user.gender = options.gender;
    }
    if (options.country) {
      user.country = options.country;
    }

    // Social
    if (options.discord) {
      user.discord = options.discord;
    }
    if (options.facebook) {
      user.facebook = options.facebook;
    }
    if (options.instagram) {
      user.instagram = options.instagram;
    }
    if (options.steam) {
      user.steam = options.steam;
    }

    if (options.twitter) {
      user.twitter = options.twitter;
    }
    if (options.snapchat) {
      user.snapchat = options.snapchat;
    }
    if (options.twitch) {
      user.twitch = options.twitch;
    }
    if (options.tiktok) {
      user.tiktok = options.tiktok;
    }

    if (options.languages.length) {
      const freshLanguages = options.languages.map((lang) => {
        return { ...lang, userId };
      });
      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(Language)
        .where('userId = :userId', { userId })
        .execute();

      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Language)
        .values(freshLanguages)
        .returning('*')
        .execute();
    }

    if (options.schedules.length) {
      const freshSchedules = options.schedules.map((sched) => {
        return {
          ...sched,
          from: parseInt(sched.from!),
          to: parseInt(sched.to!),
          userId,
        };
      });
      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('userId = :userId', { userId })
        .execute();
      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Schedule)
        .values(freshSchedules)
        .returning('*')
        .execute();
    }

    return user.save();
  }

  @Mutation(() => UserResponse)
  async register(
    @Arg('options') options: EmailUsernamePasswordInput,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const errors = validateRegister(options);
    if (errors) {
      return { errors };
    }

    const { email, username, password } = options;
    const hashedPassword = await argon2.hash(password);

    let user;
    try {
      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: username,
          email: email,
          password: hashedPassword,
        })
        .returning('*')
        .execute();

      user = result.raw[0];
    } catch (err) {
      //|| err.detail.includes("already exists")) {
      // duplicate username error
      if (err.code === '23505') {
        return {
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        };
      }
    }

    // store user id session
    // this will set a cookie on the user
    // keep them logged in
    req.session.userId = user.id;

    return { user };
  }

  @Mutation(() => UserResponse)
  async login(
    @Arg('usernameOrEmail') usernameOrEmail: string,
    @Arg('password') password: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes('@')
        ? { where: { email: usernameOrEmail } }
        : { where: { username: usernameOrEmail } }
    );

    if (!user) {
      return {
        errors: [
          { field: 'usernameOrEmail', message: "that username doesn't exist" },
        ],
      };
    }

    const valid = await argon2.verify(user.password, password);

    if (!valid) {
      return {
        errors: [{ field: 'password', message: 'incorrect password' }],
      };
    }

    req.session.userId = user.id;

    return {
      user,
    };
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { req, res }: MyContext) {
    const sessions = await getRepository(Session)
      .createQueryBuilder('session')
      .select('session.sid')
      .where('session.sess ::jsonb @> :sess', {
        sess: { userId: req.session.userId },
      })
      .getRawMany();

    const { session_sid } = sessions.find(
      ({ session_sid }) => req.cookies[COOKIE_NAME].indexOf(session_sid) > 0
    );

    await Session.delete({ sid: session_sid });

    return new Promise((resolve) =>
      req.session.destroy((err: any) => {
        res.clearCookie(COOKIE_NAME);
        if (err) {
          log(err);
          resolve(false);
          return;
        }

        resolve(true);
      })
    );
  }

  @Mutation(() => Boolean)
  async forgotPassword(@Arg('email') email: string) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      // the email is not in the db
      return true;
    }

    user.resetToken = v4();
    await user.save();

    const html = `<a href="${process.env.CORS_ORIGIN}/change-password/${user.resetToken}">reset password</a>`;

    sendEmail('Password Reset', email, html);
    return true;
  }

  @Mutation(() => UserResponse)
  async changePassword(
    @Arg('token') token: string,
    @Arg('newPassword') newPassword: string,
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    if (newPassword.length <= 2) {
      return {
        errors: [
          {
            field: 'newPassword',
            message: 'length must be greater than 2',
          },
        ],
      };
    }

    const user = await User.findOne({ where: { resetToken: token } });

    if (!user) {
      return {
        errors: [
          {
            field: 'token',
            message: 'token expired',
          },
        ],
      };
    }

    user.password = await argon2.hash(newPassword);
    user.resetToken = '';
    await user.save();

    req.session.userId = user.id;

    return {
      user,
    };
  }
}
