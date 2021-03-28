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
let tfCam

async function setup() {
  console.log('Loading model..');
  coco = await cocoSsd.load();
  console.log('Successfully loaded model');
  
  const webcamElement = document.getElementById('webcam');
  video = webcamElement
  tfCam = await tf.data.webcam(webcamElement);
  // enableCam()
  app()
}

setup()

async function app() {
  
    const img = await tfCam.capture();

    const items = await coco.detect(img);

    const now = new Date().getTime();

    const lastCar = values["car"] || { start: now, count: 0 , time: now, startPos: 0 };

    // check if the last car has passed
    // assume if it hasn't been seen for 1 second its gone
    if (items.length === 0 && (now - lastCar.time) > 1000 && !lastCar.logged) {
      lastCar.logged = true;
      values["car"] = lastCar;
      logStats(lastCar)
      if (lastCar && lastCar.image && lastCar.endPos) {
        addCar(lastCar)
      }
    }

    for (const pred of items) {

      if (pred.class === "car" || pred.class === "truck") {
        
        let car = values["car"] || { start: now, count: 0 , time: now, startPos: pred.bbox, width: pred.bbox[2] };
        if ((now - car.time) < 500) {
          // same car
          car.count += 1;
          car.time = now;
          car.end = now;
          car.endPos = pred.bbox;
          if (car.width < pred.bbox[2]) {
            car.width = pred.bbox[2]
          }
          values["car"] = car;
          // console.log(pred.bbox[2])
        } else {
          const lastCar = values["car"];
          cars.push(lastCar)
          if (lastCar && lastCar.image && lastCar.endPos) {
            // logStats(lastCar)
            // if (lastCar.realSpeed > 20 && lastCar.realSpeed < 80) {
            //   // post(lastCar)
            // addCar(lastCar)
            // }
          }
          // console.log('last car ' + (lastCar.end - lastCar.start))
          // assume a new car
          console.log('---- new car -----')
          values["car"] = { start: now, count: 1, time: now, startPos: pred.bbox, width: pred.bbox[2] };
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

    img.dispose();
    await tf.nextFrame();
    app();
  }

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

function logStats(lastCar) {
  if (lastCar && lastCar.image && lastCar.endPos) {
    const x1 = lastCar.startPos[0];
    const x2 = lastCar.endPos[0];
    const y1 = lastCar.startPos[1];
    const y2 = lastCar.endPos[2];
    const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    console.log('distance ' + dist);

    let width = lastCar.width;

    // 800 px / 7 in wide
    const PPI = 1024 / 9
    const widthInch = width / PPI;

    // use this to convert screen inch to real inch
    const aveCarLength = 192;  // inches

    const carLength = widthInch * aveCarLength;
    console.log('car length ' + (carLength / 12))
    const time = lastCar.end - lastCar.start;
    const inchDist = dist / PPI;
    // console.log('inch dist ' + inchDist);

    // scale screen inches to real inches
    const realInches = inchDist * aveCarLength;
    const feet = realInches / 12;

    // console.log('real inch dist ' + realInches)
    console.log('feet ' + feet)
    const seconds = time / 1000;
    console.log('seconds ' + seconds);

    const feetPerSecond = feet / seconds;

    console.log('FPS ' + feetPerSecond)

    // convert feet per second to mph
    const mph = feetPerSecond / 1.467;

    console.log('mph ' + mph)
    lastCar.realSpeed = mph;
  }
}

function addCar(car) {
  const totalEl = document.getElementById('total');
  totalEl.innerHTML = cars.length;
  var ul = document.getElementById("cars");
  var li = document.createElement("li");
  // var img=document.createElement('img');
  // img.src=car.img;
  var span = document.createElement("span")
  span.innerHTML = Math.round(car.realSpeed);
  li.appendChild(span);
  li.appendChild(car.image);
  ul.appendChild(li);
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