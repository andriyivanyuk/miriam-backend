export default ({ env }) => ({
  upload: {
    config: {
      provider: "cloudinary",
      providerOptions: {
        cloud_name: env("CLOUDINARY_NAME"),
        api_key: env("CLOUDINARY_KEY"),
        api_secret: env("CLOUDINARY_SECRET"),
      },
      actionOptions: {
        upload: {},
        delete: {},
      },
    },
  },
  email: {
    config: {
      provider: "nodemailer",
      providerOptions: {
        host: env("SMTP_HOST", "smtp-relay.brevo.com"),
        port: env.int("SMTP_PORT", 587),
        secure: false,
        auth: {
          user: env("SMTP_USER"),
          pass: env("SMTP_PASS"),
        },
      },
      settings: {
        defaultFrom: env("SMTP_FROM", "no-reply@miriam.ua"),
        defaultReplyTo: env("SMTP_REPLY_TO", "support@miriam.ua"),
      },
    },
  },
});
