from brave.overlays.text import TextOverlay


class ClockOverlay(TextOverlay):
    '''
    For doing a text overlay (text graphic).
    '''


    def permitted_props(self):
        return {
            **super().permitted_props(),
            'text': {
                'type': 'str',
                'default': ''
            },
            'timeFormat': {
                'type': 'str',
                'default': '%H:%M:%S',
            },
        }

    def create_elements(self):
        self.element = self.source.add_element('clockoverlay', self, audio_or_video='video')
        self.set_element_values_from_props()


    def set_element_values_from_props(self):
        super().set_element_values_from_props()
        self.element.set_property('time-format', self.timeFormat)
