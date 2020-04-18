/*!
 * Magic Starts Here
 * https://NetworkPersonalConnections.ChrisSpiegl.com
 */

$(() => {
  console.log('Frontend is here too')

// ====================================================================
// ====================================================================
// Preview Image Render
// ====================================================================
// ====================================================================

  const initImagePreview = () => {
    console.log('Preview Wall: starting');
    const image = $('#streamWallImage');
    if (!image || !image.length) {
      console.log('Preview Wall: no element to put preview');
      return
    }
    setInterval(refreshImagePreview, 1000)
  }

  const refreshImagePreview = () => {
    const image = $('#streamWallImage');
    console.log('Preview Wall: Updating image');
    if (!image || !image.length) {
      console.log('Preview Wall: no element to put preview');
      return
    }
    $(image).attr('src', '/gstreamer/wall.jpg?' + Math.floor(Date.now()/100))
  }

  initImagePreview()

})
