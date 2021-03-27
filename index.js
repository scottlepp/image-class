let net;

// const webcamElement = document.getElementById('webcam');
// const classifier = knnClassifier.create();

// async function app() {
//   console.log('Loading mobilenet..');

//   // Load the model.
//   net = await mobilenet.load();
//   console.log('Successfully loaded model');

//   // Make a prediction through the model on our image.
//   const imgEl = document.getElementById('img');
//   const result = await net.classify(imgEl);
//   console.log(result);

//   cocoSsd.load().then(model => {
//     // detect objects in the image.
//     model.detect(img, 50, 0.2).then(predictions => {
//       console.log('Predictions: ', predictions);
//     });
//   });
// }

HTMLElement.prototype.prependHtml = function (element) {
  const div = document.createElement('li');
  div.innerHTML = element;
  this.insertBefore(div, this.firstChild);
};

HTMLElement.prototype.appendHtml = function (element) {
  const div = document.createElement('li');
  div.innerHTML = element;
  while (div.children.length > 0) {
      this.appendChild(div.children[0]);
  }
};

async function pause(time) {
  return setTimeout(() => {
    
  }, time);
}

const timer = ms => new Promise(res => setTimeout(res, ms))

const values = {};
const cars = [];

async function app() {
  // console.log('Loading mobilenet..');

  // Load the model.
  // net = await mobilenet.load();
  // console.log('Successfully loaded model');

  console.log('Loading model..');
  coco = await cocoSsd.load();
  console.log('Successfully loaded model');
  
    // detect objects in the image.
    // model.detect(img, 50, 0.2).then(predictions => {
    //   console.log('Predictions: ', predictions);
    // });

  
  // Create an object from Tensorflow.js data API which could capture image 
  // from the web camera as Tensor.
  const webcamElement = document.getElementById('webcam');
  const webcam = await tf.data.webcam(webcamElement);

  let start = 0, end = 0, time;

  while (true) {
    const img = await webcam.capture();
    // const result = await net.classify(img);

    // document.getElementById('console').innerText = `
    //   prediction: ${result[0].className}\n
    //   probability: ${result[0].probability}
    // `;

    // for (const res of result) {
    //   const val = values[res.className] || res.probability
    //   if (val <= res.probability) {
    //     values[res.className] = res.probability
    //     add(res.className, res.probability)
    //   }
    // }

    coco.detect(img).then(items => {
      // console.log('Predictions: ', predictions);
      // if (items.length === 0) {
      //   now = new Date().getTime();
      //   time = now - start;
      //   if (time > 200) {
      //     end = now
      //     console.log(end - start);
      //   }
      //   start = 0;
      // } else {
      //   if (start === 0 && time > 200) {
      //     console.log("new car at " + new Date().toLocaleTimeString())
      //     start = new Date().getTime();
      //   }
      // }
      // if (items.length === 0) {
      //   const now = new Date().getTime();
      //   let car = values["car"] || { start: now, count: 0 , time: now };
      //   if (car.count > 0 && (now - car.time) < 500) {
      //     car.count += 1;
      //     car.time = now;
      //     values["car"] = car;
      //   }
      // }
      // const now = new Date().getTime();
      // const car = values["car"];
      // if (car && ((now - car.start) > 10000)) {

      // }

      for (const pred of items) {
        // const val = values[pred.class] || 0
        // if (val <= pred.score) {
        // }

        if (pred.class === "car" || pred.class === "truck") {
          const now = new Date().getTime();
          let car = values["car"] || { start: now, count: 0 , time: now, startPos: pred.bbox };
          if ((now - car.time) < 500) {
            // same car
            car.count += 1;
            car.time = now;
            car.end = now;
            car.endPos = pred.bbox;
            values["car"] = car;
          } else {
            const lastCar = values["car"];
            cars.push(lastCar)
            if (lastCar && lastCar.image && lastCar.endPos) {
              const x1 = lastCar.startPos[0];
              const x2 = lastCar.endPos[0];
              const y1 = lastCar.startPos[1];
              const y2 = lastCar.endPos[2];
              const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
              console.log('distance ' + dist);

              // inches
              const aveCarLength = 192;

              const scaledDist = dist * 192;

              const time = lastCar.end - lastCar.start;
              // size of a car on screen is about 3/4 of an inch .75
              const speed = dist / time * (aveCarLength * .75);
              console.log('speed ' + speed)
              const inchDist = dist / 96;
              console.log('time ' + time);
              console.log('inches ' + inchDist);

              // assume 1 inch scale
              const scale = 1;
              const feet = scale * 12;

              // inch to feet * 12, feet to car average length * 16
              // car average lenght is 192 in
              // const aveCarLength = 192;
              // const aveCarLength = 200;
              const scaled = inchDist * aveCarLength;
              console.log('scaled ' + scaled)
              // console.log('scaled speed ' + (scaled / time))
              // inch per second to mph
              const realSpeed = scaled / 17.6;
              lastCar.realSpeed = realSpeed;
              lastCar.realSpeed = speed;

              console.log('realSpeed ' + realSpeed)
              console.log('count ' + lastCar.count)
              if (speed > 20 && speed < 80) {
                post(lastCar)
                addCar(lastCar)
              }
            }
            console.log('last car ' + (lastCar.end - lastCar.start))
            // if (lastCar.end = lastCar.start)
            // assume a new car
            console.log('---- new car -----')
            values["car"] = { start: now, count: 1, time: now, startPos: pred.bbox };
            setTimeout(() => {
              const {image, canvas} = getScreenshot(webcamElement);
              values["car"].image = image;
              values["car"].canvas = canvas;
              // addCar(lastCar)
            }, 200);
          }
          // const count = val.count + 1
          // values[pred.class] = count
          add(pred.class, car);
        } else {
          console.log(pred.class)
        }
      }
      
    });

    // Dispose the tensor to release the memory.
    img.dispose();

    // Give some breathing room by waiting for the next animation frame to
    // fire.
    await tf.nextFrame();
    await timer(0);
  }
}

app();

// async function loadAndPredict() {
//   const net = await bodyPix.load(/** optional arguments, see below **/);

//   const img = document.getElementById('img');
//   /**
//    * One of (see documentation below):
//    *   - net.segmentPerson
//    *   - net.segmentPersonParts
//    *   - net.segmentMultiPerson
//    *   - net.segmentMultiPersonParts
//    * See documentation below for details on each method.
//    */
//   const segmentation = await net.segmentPerson(img);
//   console.log(segmentation);
// }
// loadAndPredict();

function add(cat, car) {

  const val = `${cat} ${car.count}`
  var li = document.getElementById(cat);
  if (li === undefined || li === null) {
    var ul = document.getElementById("list");
    var li = document.createElement("li");
    li.id = cat
    li.appendChild(document.createTextNode(val));
    ul.appendChild(li);
  } else {
    li.innerHTML = val;
  }
}

/**
 * Takes a screenshot from video.
 * @param videoEl {Element} Video element
 * @param scale {Number} Screenshot scale (default = 1)
 * @returns {Element} Screenshot image element
 */
function getScreenshot(videoEl, scale) {
  scale = scale || 1;

  const canvas = document.createElement("canvas");
  canvas.width = videoEl.clientWidth * scale;
  canvas.height = videoEl.clientHeight * scale;
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const image = new Image()
  image.src = canvas.toDataURL();
  return {image, canvas};
}

function addCar(car) {
  const totalEl = document.getElementById('total');
  totalEl.innerHTML = cars.length;

  // var ul = document.getElementById("cars");
  // var li = document.createElement("li");
  // // var img=document.createElement('img');
  // // img.src=car.img;
  // var span = document.createElement("span")
  // span.innerHTML = Math.round(car.realSpeed);
  // li.appendChild(span);
  // li.appendChild(car.image);
  // ul.appendChild(li);
}

async function post(car) {
  const image = car.image.src.split(',')[1]
  //var encodedString = btoa(image);
  // const body = `speed,car="${image}" value=${car.speed}`;
  car.name = new Date().getTime();
  const url = `http://localhost:8082/cars/${car.name}.png`;
  const body = `speed mph=${car.realSpeed},car="${url}"`;

  const rawResponse = await fetch('http://localhost:8086/api/v2/write?org=scott&bucket=cars&precision=s', {
    method: 'POST',
    headers: {
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': 'Token vHUKKHCJ0XjsKuV8KPcj7MxG7boWmv2bv_zBQU8UewsIapO6g34rzFBlqnN3fgBAf3_4zFi1kxQJRmCvQLeChA=='
    },
    body
  });

  const canvas = car.canvas;
  canvas.toBlob(async function(blob) {
    const formData = new FormData();
    formData.append('car', blob, `${car.name}.png`);
    const res = await fetch('http://localhost:8082/upload', {
      method: 'POST',
      body: formData
    });
    const rawResponse = await res.json()
    // const content = await rawResponse.json();
    console.log(rawResponse);
  });
}