# watermelon-db-plugin 🍉

Config plugin to auto configure `@nozbe/watermelondb`
This is a fork from `@morrowdigital/watermelondb-expo-plugin` with a Podfile extra code that allows you to use watermelondb with Firebase. (Fixes useFrameworks bugs when building)

**This is not meant to be mantained or updated. Please check original author repo for updates**

## Install

> Tested against Expo SDK 47 and 48

```
yarn add @rafaellupo/watermelondb-firebase-expo-plugin

```

> Please make sure you also install **[expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/)**

After installing this npm package, add the [config plugin](https://docs.expo.io/guides/config-plugins/) to the [`plugins`](https://docs.expo.io/versions/latest/config/app/#plugins) array of your `app.json` or `app.config.js`. Then rebuild your app as described in the ["Adding custom native code"](https://docs.expo.io/workflow/customizing/) guide.

## Example

In your app.json `plugins` array:

```json
{
  "plugins": [
    "@rafaellupo/watermelondb-firebase-expo-plugin",
    [
      "expo-build-properties",
      {
        "android": {
          "kotlinVersion": "1.6.10"
        }
      }
    ]
  ]
}
```
