# Video call demo converted to Daily from Agora RTC Web SDK 4.x

## Overview

This repository contains demo code that was originally using the Agora RTC Web SDK 4.x, converted to Daily's video call API.

## Steps to run

### Sign up for Daily and create a room

* Sign up for a [free Daily account](https://dashboard.daily.co/signup).
* [Create a Daily room](https://dashboard.daily.co/rooms/create) in your Daily developer dashboard.
  * If you'd like to not specify a meeting token for this demo, make sure the room privacy is set to "Public" on the creation page.
* Click on your newly created room name and copy the room URL


### Run the demo

In the terminal, run the following commands:

```
git clone git@github.com:daily-demos/agora-daily-conversion.git
cd agora-daily-conversion
npm i && npm run demo:dev
````

Open the URL shown in your terminal using your chosen browser to run the demo application.

Click on the demo you want to run (currently a single demo is available).

On the demo page, enter your Daily room URL, optional [Daily meeting token](https://docs.daily.co/guides/privacy-and-security/meeting-tokens), and optional name.

## Reference

- [`daily-js` reference documentation](https://docs.daily.co/reference/daily-js)
- [Understanding calls with Daily's dashboard](https://docs.daily.co/guides/architecture-and-monitoring/experiment-in-the-dashboard)

## Feedback

If you have any problems or suggestions regarding the sample projects, feel free to file an issue.

## License

The sample projects are under the MIT license. See the [LICENSE](./LICENSE) file for details.
