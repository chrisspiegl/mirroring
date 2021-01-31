# Stream Mirroring

![current status](https://img.shields.io/badge/current%20status-halted-red?style=flat-square) ![GitHub package.json version](https://img.shields.io/github/package-json/v/chrisspiegl/mirroring?style=flat-square&label=current%20version) ![GitHub last commit](https://img.shields.io/github/last-commit/chrisspiegl/mirroring?style=flat-square)

## Halted Project

I lost motivation to work on this for now. The code is here if you want to take a look.

## About

RTMP Restreaming, Transcoding, and some more built around Node.JS

State: extremely experimental (even though I use it in my own setup).

<!--![GitHub Release Date](https://img.shields.io/github/release-date/chrisspiegl/mirroring?style=flat-square)-->

## Purpose

This project is to build an easy to use restreaming utility that runs on a small(ish) cloud server — or for some things maybe a more powerful server. The current features include:

- Database based Stream Key Management
- Database based Relay Management (where to restream to)
- Enable and Disable stream keys as well as relays.

## Todo List

- Basic user authentication (and with that making the stream keys and relays user login associated)
- More useful dashboard with preview of certain streams
- and more

## Future Ideas

- Finding a way for continuous streaming (no interruption / backup stream functionality)
	- This I have tried to achive with many ways (ffmpeg, gstreamer, CasparCG, and more) but up to this point most ideas where not doable with small cloud servers. Maybe I'll find a way someday.
- Transcoder Interface
	- Right now, the dynamic relays just send what they receive.
	- In the future I will add the ability to make relays transcode on the fly and the settings can be changed in the web dashboard.
- Dashboard with more information about currently active streams and relays (including:)
	- Preview possibility
	- See Bitrate, Framerate, Audio Details, Resolution, etc.
	- Administrator to be able to see:
		- How many streams, relays, and transcoders are active
		- Server CPU and RAM usage
- Implement Twitch, YouTube, Facebook, and maybe others — Chat Pulling?
	- This may turn out to be a separate project in itself to have a unified chat where all messages are collected and displaid+answerable.
- Twitch, YouTube, Facebook — Stream Details Editing
	- At this time I do not see a reason for this, it's too potentialy error prone and I feel more comfortable opening the interfaces of the respecitve sites to know that the stream actually works there.

## Creator: Chris Spiegl

- Website [ChrisSpiegl.com](https://ChrisSpiegl.com)
- Twitter [@ChrisSpiegl](https://twitter.com/ChrisSpiegl)
- Instagram [@ChrisSpiegl](https://instagram.com/ChrisSpiegl)

## Credits

This project is heavily based on other open source packages, mainly I want to mention [Node-Media-Server](https://github.com/illuspas/Node-Media-Server) (NMS) which is the RTMP server that I am basing this whole thing on. Mirroring is basically a web-interface for NMS and a few customizations on top.
