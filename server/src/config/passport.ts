import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as FacebookStrategy } from "passport-facebook";
import { UserRepository } from "../repositories/user.repository";
import * as bcrypt from "bcrypt";
import type { UserContext } from "../models";

const userRepository = new UserRepository();

function toUserContext(user: any): UserContext {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar || null,
    roles: user.userRoles?.map((ur: any) => ur.role.name) || [],
    permissions: user.userRoles?.flatMap((ur: any) =>
      ur.role.rolePermissions?.map((rp: any) => rp.permission.name) || []
    ) || []
  };
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: `${process.env.API_URL || "http://localhost:5000"}/api/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@google.com`;
        let user = await userRepository.findByEmail(email);

        if (!user) {
          const randomPassword = Math.random().toString(36).slice(-12) + "Aa1!";
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          let username = baseUsername;

          let attempt = 0;
          while (await userRepository.findByUsername(username)) {
            attempt++;
            username = `${baseUsername}${attempt}`;
          }

          const roles = await userRepository.getRoles();
          const managerRole = roles.find((r: any) => r.name === "manager");
          const roleId = managerRole ? managerRole.id : 2;

          await userRepository.create(
            {
              username,
              email,
              password: hashedPassword,
              avatar: profile.photos?.[0]?.value || null,
              status: "active",
            },
            roleId
          );
          user = await userRepository.findByEmail(email);
        } else {
          const isCustomer = user.userRoles?.some((ur: any) => ur.role.name === "customer");
          if (isCustomer) {
            const roles = await userRepository.getRoles();
            const managerRole = roles.find((r: any) => r.name === "manager");
            if (managerRole) {
              await userRepository.assignRoles(user.id, [managerRole.id]);
              user = await userRepository.findByEmail(email);
            }
          }
        }

        if (!user) {
          return done(new Error("Không thể tạo hoặc tìm thấy người dùng."));
        }

        return done(null, toUserContext(user));
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID || "",
      clientSecret: process.env.FACEBOOK_APP_SECRET || "",
      callbackURL: `${process.env.API_URL || "http://localhost:5000"}/api/auth/facebook/callback`,
      profileFields: ["id", "emails", "name", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || `${profile.id}@facebook.com`;
        let user = await userRepository.findByEmail(email);

        if (!user) {
          const randomPassword = Math.random().toString(36).slice(-12) + "Aa1!";
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          const baseUsername = (profile.name?.givenName || `fb_${profile.id}`).toLowerCase().replace(/[^a-z0-9]/g, "");
          let username = baseUsername;

          let attempt = 0;
          while (await userRepository.findByUsername(username)) {
            attempt++;
            username = `${baseUsername}${attempt}`;
          }

          const roles = await userRepository.getRoles();
          const managerRole = roles.find((r: any) => r.name === "manager");
          const roleId = managerRole ? managerRole.id : 2;

          await userRepository.create(
            {
              username,
              email,
              password: hashedPassword,
              avatar: profile.photos?.[0]?.value || null,
              status: "active",
            },
            roleId
          );
          user = await userRepository.findByEmail(email);
        } else {
          const isCustomer = user.userRoles?.some((ur: any) => ur.role.name === "customer");
          if (isCustomer) {
            const roles = await userRepository.getRoles();
            const managerRole = roles.find((r: any) => r.name === "manager");
            if (managerRole) {
              await userRepository.assignRoles(user.id, [managerRole.id]);
              user = await userRepository.findByEmail(email);
            }
          }
        }

        if (!user) {
          return done(new Error("Không thể tạo hoặc tìm thấy người dùng."));
        }

        return done(null, toUserContext(user));
      } catch (error) {
        return done(error as Error);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await userRepository.findById(id);
    if (!user) {
      return done(new Error("Người dùng không tồn tại."));
    }
    done(null, toUserContext(user));
  } catch (error) {
    done(error);
  }
});

export default passport;
