let net;

var worker = new Worker('worker.js');

worker.addEventListener('message', function(e) {
  console.log(e.data)
}, false);

worker.postMessage({'cmd': 'start', 'msg': 'Hi'});

const timer = ms => new Promise(res => setTimeout(res, ms))

const values = {};
const cars = [];

let video

async function setup() {
  console.log('Loading model..');
  coco = await cocoSsd.load();
  console.log('Successfully loaded model');
  
  const webcamElement = document.getElementById('webcam');
  video = webcamElement
  enableCam()
}

setup()

async function app() {
  
  // Create an object from Tensorflow.js data API which could capture image 
  // from the web camera as Tensor.
  // const webcamElement = document.getElementById('webcam');
  // const webcam = await tf.data.webcam(webcamElement);

  // while (true) {
  //   const img = await webcam.capture();

    coco.detect(video).then(items => {
      for (const pred of items) {

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

              const time = lastCar.end - lastCar.start;
              // size of a car on screen is about 3/4 of an inch .75
              const speed = dist / time * (aveCarLength * .75);
              console.log('speed ' + speed)
              const inchDist = dist / 96;
              console.log('time ' + time);
              // console.log('inches ' + inchDist);

              // assume 1 inch scale
              const scale = 1;
              const feet = scale * 12;
              // inch to feet * 12, feet to car average length * 16
              // car average lenght is 192 in
              const scaled = inchDist * aveCarLength;
              // console.log('scaled ' + scaled)
              // inch per second to mph
              const realSpeed = scaled / 17.6;
              lastCar.realSpeed = realSpeed;
              lastCar.realSpeed = speed;

              // console.log('realSpeed ' + realSpeed)
              // console.log('count ' + lastCar.count)
              if (speed > 20 && speed < 80) {
                // post(lastCar)
                addCar(lastCar)
              }
            }
            console.log('last car ' + (lastCar.end - lastCar.start))
            // assume a new car
            console.log('---- new car -----')
            values["car"] = { start: now, count: 1, time: now, startPos: pred.bbox };
            setTimeout(() => {
              const {image, canvas} = getScreenshot(video);
              values["car"].image = image;
              values["car"].canvas = canvas;
            }, 200);
          }
          add(pred.class, car);
        } else {
          console.log(pred.class)
        }
      }

      window.requestAnimationFrame(app);
      
    });

    // Dispose the tensor to release the memory.
    // img.dispose();

    // Give some breathing room by waiting for the next animation frame to
    // fire.
    await tf.nextFrame();
    // await timer(0);
  }
// }

// app();

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
}

async function post(car) {
  const image = car.image.src.split(',')[1]
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

function enableCam(event) {
  // Only continue if the COCO-SSD has finished loading.
  // if (!model) {
  //   return;
  // }
  
  // Hide the button once clicked.
  // event.target.classList.add('removed');  
  
  // getUsermedia parameters to force video but not audio.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', app);
  });
}