/*!
 * Magic Starts Here
 * https://mirroring.ChrisSpiegl.com
 */

$(() => {
  console.log('Frontend is here too')
  const clipboard = new ClipboardJS('.buttonClipboard', {
    text: function (trigger) {
      return $(trigger).siblings('input').val()
    }
  })
  clipboard.on('success', function (e) {
    console.info('Copy to clipboard - success:');
    console.info('Action:', e.action)
    console.info('Text:', e.text)
    console.info('Trigger:', e.trigger)
    e.clearSelection()
  })
  clipboard.on('error', function (e) {
    console.info('Copy to clipboard - error:');
    console.error('Action:', e.action)
    console.error('Trigger:', e.trigger)
  })

  const autoHidePasswordAgain = ($button, $input) => {
    console.log('init autoHidePasswordAgain');
    return () => {
      console.log('doing autoHidePasswordAgain');
      $input.attr('type', 'password')
      $button.text('Show')
    }
  }

  $('.buttonShowStreamKey').click((e) => {
    const $button = $(e.target)
    const $input = $(e.target).siblings('input')
    if ($input.attr('type') === 'text') {
      $input.attr('type', 'password')
      $button.text('Show')
    } else {
      $input.attr('type', 'text')
      $button.text('Hide')
      setTimeout(autoHidePasswordAgain($button, $input), 10000) // auto hide after 10 seconds
    }
  })
})
