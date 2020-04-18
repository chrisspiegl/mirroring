from brave.overlays.overlay import Overlay


class TextOverlay(Overlay):
    '''
    For doing a text overlay (text graphic).
    '''

    def permitted_props(self):
        return {
            **super().permitted_props(),
            'text': {
                'type': 'str',
                'default': 'Default text'
            },
            'valignment': {
                'type': 'str',
                'default': 'top',
                'permitted_values': {
                    'top': 'Top',
                    'center': 'Center',
                    'bottom': 'Bottom',
                    'baseline': 'Baseline',
                    'position': 'Absolute position clamped to canvas',
                    'absolute': 'Absolute position',
                }
            },
            'halignment': {
                'type': 'str',
                'default': 'left',
                'permitted_values': {
                    'left': 'Left',
                    'center': 'Center',
                    'right': 'Right',
                    'position': 'Absolute position clamped to canvas',
                    'absolute': 'Absolute position',
                }
            },
            'fontDesc': {
                'type': 'str',
                'default': 'Sans, 12'
            },
            'lineAlignment': {
                'type': 'str',
                'default': 'center',
                'permitted_values': {
                    'left': 'left',
                    'center': 'center',
                    'right': 'right',
                }
            },
            'shadedBackground': {
                'type': 'bool',
                'default': False
            },
            'visible': {
                'type': 'bool',
                'default': False
            },
            'xabsolute': {
                'type': 'float',
                'default': 0
            },
            'yabsolute': {
                'type': 'float',
                'default': 0
            },
            'xpos': {
                'type': 'float',
                'default': 0
            },
            'ypos': {
                'type': 'float',
                'default': 0
            },
            'xpad': {
                'type': 'int',
                'default': 0
            },
            'ypad': {
                'type': 'int',
                'default': 0
            },
        }

    def create_elements(self):
        self.element = self.source.add_element('textoverlay', self, audio_or_video='video')
        self.set_element_values_from_props()

    def set_element_values_from_props(self):
        self.element.set_property('text', self.text)
        self.element.set_property('valignment', self.valignment)
        self.element.set_property('halignment', self.halignment)
        self.element.set_property('font-desc', self.fontDesc)
        self.element.set_property('shaded-background', self.shadedBackground)
        self.element.set_property('line-alignment', self.lineAlignment)
        self.element.set_property('x-absolute', self.xabsolute)
        self.element.set_property('y-absolute', self.yabsolute)
        self.element.set_property('xpos', self.xpos)
        self.element.set_property('ypos', self.ypos)
        self.element.set_property('xpad', self.xpad)
        self.element.set_property('ypad', self.ypad)
