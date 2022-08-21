# Caption This

![](./assets/demo.gif)

This application allows you to add captions to your photos via SMS.

## Prerequisite

You will need the following:

- [Twilio Account SID and Auth Token](https://www.twilio.com/console)
- [Twilio API Key](https://www.twilio.com/docs/iam/keys/api-key)
- [BannerBear API Key](https://app.bannerbear.com/projects/)
- [BannerBear Image Template ID](https://app.bannerbear.com/projects/)

## Testing Locally

Execute the following command in the shell:

```sh
docker compose -f "docker-compose.dev.yml" up -d --build
```