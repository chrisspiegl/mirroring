/api/overlay/1 # text top right
/api/overlay/2 # text center
/api/overlay/3 # clock bottom left
{ "visible": false }
{ "visible": true }
{ "text": "NEW TEXT" }

/api/mixer/1/remove_source
{ "uid": "input1" } # removes background image
{ "uid": "input2" } # removes logo top left
{ "uid": "input3" } # removes replay bottom left






# Pip Packages Installation

For making requests to URLs

`pip install requests`

Basic Minimalistic Framework for Web Server / API

`pip install sanic`

`pip install uvloop asyncio`





# Libraries

## [gstreamer-python](https://github.com/jackersson/gstreamer-python)

Gstreamer abstraction to work with Gstreamer metadata and pipelinemanagement.


# Tutorial Setup — Jackerson / 

```
git clone https://github.com/jackersson/gst-python-tutorials.git

python3 -m venv venv
source venv/bin/activate
```

May have to run these exports for the compiler/setup stuff to find the `libffi`

For compilers to find libffi you may need to set:

```
  export LDFLAGS="-L/usr/local/opt/libffi/lib"
```

For pkg-config to find libffi you may need to set:

```
  export PKG_CONFIG_PATH="/usr/local/opt/libffi/lib/pkgconfig"
```

```
pip install --upgrade wheel pip setuptools
pip install --upgrade --requirement requirements.txt
```


# macOS setup with brew packages Gstreamer development

https://github.com/bbc/brave/blob/master/docs/install_macos.md

```
brew install \
python \
libffi
```

```
brew install \
gstreamer \
gst-python \
gst-editing-services \
gst-libav \
gst-plugins-bad \
gst-plugins-base \
gst-plugins-good \
gst-plugins-ugly \
gst-python \
gst-rtsp-server \
gst-validate
```

# Ubuntu installation packages for Gstreamer development

```
apt install \
gstreamer1.0-alsa \
gstreamer1.0-dev \
gstreamer1.0-doc \
gstreamer1.0-gl \
gstreamer1.0-gtk3 \
gstreamer1.0-libav \
gstreamer1.0-plugins-bad \
gstreamer1.0-plugins-base \
gstreamer1.0-plugins-good \
gstreamer1.0-plugins-ugly \
gstreamer1.0-pulseaudio \
gstreamer1.0-qt5 \
gstreamer1.0-tools \
gstreamer1.0-x \
libgstreamer-plugins-base1.0-dev \
libgstreamer1.0-0 \
libgstreamer1.0-dev
```