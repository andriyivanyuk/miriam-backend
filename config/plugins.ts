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
      provider: 'nodemailer',
      providerOptions: {
        host: env('SMTP_HOST', 'smtp-relay.brevo.com'),
        port: env.int('SMTP_PORT', 587),
        secure: false, 
        auth: {
          user: env('SMTP_USER'),
          pass: env('SMTP_PASS'),
        },
        // інколи корисно:
        // tls: { rejectUnauthorized: false },
      },
      settings: {
        defaultFrom: env('EMAIL_FROM', 'Miriam <andriyivvanyuk@gmail.com>'),
        defaultReplyTo: env('EMAIL_REPLY_TO', 'Miriam <andriyivvanyuk@gmail.com>'),
      },
    },
  },
});
