require('test/fixtures/styles.css')

var test = 'Eh',
    pillow = function(a) {
      return `${a}, Likes monkies`
    }

pillow(test)
export default pillow
