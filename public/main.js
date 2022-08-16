let net;

// var worker = new Worker('worker.js');

// worker.addEventListener('message', function(e) {
//   console.log(e.data)
// }, false);

// worker.postMessage({'cmd': 'start', 'msg': 'Hi'});

const timer = ms => new Promise(res => setTimeout(res, ms))

const values = {};
const cars = [];

let video
let tfCam

let liveView = document.getElementById('liveView');

let lastLog = new Date().getTime();

let geo = {coords: {latitude: 0, longitude: 0}};

const SPEED_LIMIT = 35;  // todo setting

async function setup() {

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      geo = position;
      console.log(geo)
    });
  }

  console.log('Loading model..');
  coco = await cocoSsd.load({base: 'mobilenet_v2'});
  console.log('Successfully loaded model');
  
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return;
  }
  
  // List cameras and microphones.
  // await navigator.mediaDevices.getUserMedia({video: true}); 

  // navigator.mediaDevices.enumerateDevices()
  //   .then(function(devices) {
  //     devices.forEach(function(device) {
  //       console.log(device.kind + ": " + device.label +
  //         " id = " + device.deviceId);
  //       console.log(device);
  //     });
  //   })
  //   .catch(function(e) {
  //     console.log(e.name + ": " + e.message);
  //   });

  liveView = document.getElementById('liveView');
  const webcamElement = document.getElementById('webcam');
  video = webcamElement
  const config = { facingMode: 'environment'};
  // tfCam = await tf.data.webcam(webcamElement, config);
  enableCam()
  //app()
}

setup()

var children = [];
let calibrating = false;

async function app() {
  
  // const img = await tfCam.capture();

  // const items = await coco.detect(img);

  let sd = new Date().getTime();
  const items = await coco.detect(video, 1, 0.2);
  let endsd = new Date().getTime();

  let totaltime = endsd - sd;

  const now = new Date().getTime();

  // // Remove any highlighting we did previous frame.
  // for (let i = 0; i < children.length; i++) {
  //   liveView.removeChild(children[i]);
  // }
  // children.splice(0);

  const lastCar = values["car"] || { start: now, count: 0 , time: now, startPos: 0, totalTime: totaltime };

  if (lastCar.start === now) {
    // console.log('started ' + now)
  } else {
    lastCar.totalTime = lastCar.totalTime + totaltime;
  }
  // check if the last car has passed
  // assume if it hasn't been seen for 1 second its gone
  if (items.length === 0 && (now - lastCar.time) > 1000 && !lastCar.logged) {
    lastCar.logged = true;
    values["car"] = lastCar;
    logStats(lastCar)
    // setTimeout(() => {
    //   for (let i = 0; i < children.length; i++) {
    //     liveView.removeChild(children[i]);
    //   }
    //   children.splice(0);
    // }, 200);

    if (lastCar && lastCar.endPos) {
    // if (lastCar && lastCar.image && lastCar.endPos) {
      addCar(lastCar)
      setTimeout(() => {
        const {image, canvas} = getScreenshot(video);
        lastCar.image = image;
        lastCar.canvas = canvas;
        postToLoki(lastCar)
      }, 20);
    }
  }

  if (items.length > 0) {
    for (const pred of items) {
      //setTimeout(() => {
      // const pred = items[0];
      if (pred.class === "car" || pred.class === "truck") {
        // const highlighter = document.createElement('div');
        // highlighter.setAttribute('class', 'highlighter');
        // highlighter.style = 'left: ' + (pred.bbox[0]) + 'px; top: '
        //     + pred.bbox[1] + 'px; width: ' 
        //     + pred.bbox[2] + 'px; height: '
        //     + pred.bbox[3] + 'px;';

        // liveView.appendChild(highlighter);
        // // liveView.appendChild(p);
        // children.push(highlighter);
        // children.push(p);

        const cur = new Date().getTime();
        let car = values["car"] || { start: cur, count: 0 , time: cur, startPos: pred.bbox, width: pred.bbox[2], totalTime: totaltime };
        // TODO: handle multiple cars at the same time
        if ((cur - car.time) < 500) {
          // same car
          car.count += 1;
          car.time = cur;
          car.end = cur;
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
          const startTime = new Date().getTime();
          values["car"] = { start: startTime, count: 1, time: startTime, startPos: pred.bbox, width: pred.bbox[2], totalTime: totaltime };
          // setTimeout(() => {
          //   const {image, canvas} = getScreenshot(video);
          //   values["car"].image = image;
          //   values["car"].canvas = canvas;
          // }, 200);
        }
      }
      //}, 0);
    }
  }

  // for (const pred of items) {

  //   console.log('items: ' + items.length + ' preds: ' + pred.length)
  //   // const highlighter = document.createElement('div');
  //   // highlighter.setAttribute('class', 'highlighter');
  //   // highlighter.style = 'left: ' + pred.bbox[0] + 'px; top: '
  //   //     + pred.bbox[1] + 'px; width: ' 
  //   //     + pred.bbox[2] + 'px; height: '
  //   //     + pred.bbox[3] + 'px;';
  
  //   // liveView.appendChild(highlighter);
  //   // //liveView.appendChild(p);
  //   // children.push(highlighter);

  //   // if (pred.class === 'person' && calibrating) {


  //   //   // const p = document.createElement('p');
  //   //   // p.innerText = pred.class  + ' - with ' 
  //   //   //     + Math.round(parseFloat(pred.score) * 100) 
  //   //   //     + '% confidence.';
  //   //   // p.style = 'margin-left: ' + pred.bbox[0] + 'px; margin-top: '
  //   //   //     + (pred.bbox[1] - 10) + 'px; width: ' 
  //   //   //     + (pred.bbox[2] - 10) + 'px; top: 0; left: 0;';

  //   //   const highlighter = document.createElement('div');
  //   //   highlighter.setAttribute('class', 'highlighter');
  //   //   highlighter.style = 'left: ' + pred.bbox[0] + 'px; top: '
  //   //       + pred.bbox[1] + 'px; width: ' 
  //   //       + pred.bbox[2] + 'px; height: '
  //   //       + pred.bbox[3] + 'px;';

  //   //   liveView.appendChild(highlighter);
  //   //   //liveView.appendChild(p);
  //   //   children.push(highlighter);
  //     //children.push(p);

  //           // bbox = x, y, width, height

  //     // calc PPI using known height of person standing in the road?
  //     // calc distance from camera to road based on PPI?

  //     // let person = values["person"] || { start: now, count: 0 , time: now, lastMove: now, startPos: pred.bbox, width: pred.bbox[2], grow: 0 };
  //     // //if ((now - person.time) < 1000) {
  //     //   // assume same person - still in frame within a second

  //     //   const height = pred.bbox[3];
  //     //   if (person.height === undefined) {
  //     //     person.height = height;
  //     //   }
  //     //   if (height < person.height) {
  //     //     person.height = height;
  //     //     if (person.grow > 0) {
  //     //       person.grow = person.grow - 1;
  //     //     }
  //     //   } else if (height === person.height) {

  //     //   } else {
  //     //     person.grow = person.grow + 1; 
  //     //   }

  //     //   if (person.grow > 500 && !person.screenshot) {
  //     //     console.log(person.height);
  //     //     person.screenshot = true;
  //     //     setTimeout(() => {
  //     //       const {image, canvas} = getScreenshot(video);
  //     //       person.image = image;
  //     //       person.canvas = canvas;
  //     //       addCar(person)
  //     //     }, 200);
  //     //   }
  //       // check if the person has moved
  //       // const lastPerson = values["person"] || {};
  //       // let lastMove = person.lastMove || now;
  //       // if (person.endPos) {
  //         // const secs = (now - person.lastMove) / 1000;
  //         // console.log(secs)

  //         // const lastHeight = person.endPos[3];
  //         // if (pred.bbox[0] === lastPerson.endPos[0] && pred.bbox[1] === lastPerson.endPos[1] && pred.bbox[2] === lastPerson.endPos[2] && pred.bbox[3] === lastPerson.endPos[3] && secs < 5) {
  //         //   lastMove = lastPerson.lastMove;
  //         //   // console.log(lastMove)
  //         // } else if (pred.bbox[0] === lastPerson.endPos[0] && pred.bbox[1] === lastPerson.endPos[1] && pred.bbox[2] === lastPerson.endPos[2] && pred.bbox[3] === lastPerson.endPos[3] && secs > 5 ) {
  //         //   console.log('didn not move for 5 secs');
  //         //   console.log(lastPerson.bbox)
  //         //   // reset
  //         //   lastMove = now;
  //         // } else {
  //         //   console.log(pred.bbox)
  //         //   console.log(lastPerson.endPos)
  //         //   lastMove = now;
  //         // }
  //         // const diff = Math.abs(height - lastHeight);
  //         // if (diff < 10 && secs < 5) {
  //         //   lastMove = person.lastMove;
  //         //   // console.log(lastMove)
  //         // } else if (diff < 2 && secs > 5 ) {
  //         //   console.log('didn not move for 5 secs');
  //         //   console.log(person)
  //         //   // reset
  //         //   lastMove = now;

  //         //   setTimeout(() => {
  //         //     const {image, canvas} = getScreenshot(video);
  //         //     person.image = image;
  //         //     person.canvas = canvas;
  //         //     addCar(person)
  //         //   }, 200);
  //         // } else {
  //         //   // console.log(height + ' ' + lastHeight)
  //         //   lastMove = now;
  //         // }
  //         // if (pred.bbox === lastPerson.endPos && secs < 5) {
  //         //   // person didn't move
  //         //   lastMove = lastPerson.lastMove;
  //         // }
  //         // if (pred.bbox === lastPerson.bbox && secs > 5 ) {
  //         //   console.log('didn not move for 5 secs');
  //         //   console.log(lastPerson.bbox)
  //         //   lastMove = lastPerson.lastMove;
  //         // }
  //       // } else {
  //       //   console.log(lastMove)
  //       // }

  //       // person.count += 1;
  //       // person.time = now;
  //       // person.end = now;
  //       // person.endPos = pred.bbox;
  //       // // person.lastMove = lastMove;
  //       // if (person.width < pred.bbox[2]) {
  //       //   person.width = pred.bbox[2]
  //       // }

  //       // values["person"] = person;
  //     //} else {
  //       // const lastPerson = values["person"];
  //       // if (lastPerson.endPos === pred.bbox && now-lastPerson.time) {
  //       // console.log('new person')
  //       // }
  //       // values['person'] = { start: now, count: 0 , time: now, lastMove: now, startPos: pred.bbox, width: pred.bbox[2] };
  //     //}
  //   // }

  //   // if ((now - lastLog) / 1000 > 1) {
  //   //   console.log(pred)
  //   //   lastLog = new Date().getTime();
  //   // }

  //   // if (calibrating) {
  //   //   continue;
  //   // }

  //   if (pred.class === "car" || pred.class === "truck") {
      
  //     // const p = document.createElement('p');
  //     // p.innerText = pred.class  + ' - with ' 
  //     //     + Math.round(parseFloat(pred.score) * 100) 
  //     //     + '% confidence.';
  //     // p.style = 'margin-left: ' + pred.bbox[0] + 'px; margin-top: '
  //     //     + (pred.bbox[1] - 10) + 'px; width: ' 
  //     //     + (pred.bbox[2] - 10) + 'px; top: 0; left: 0;';

  //     const highlighter = document.createElement('div');
  //     highlighter.setAttribute('class', 'highlighter');
  //     highlighter.style = 'left: ' + (pred.bbox[0]) + 'px; top: '
  //         + pred.bbox[1] + 'px; width: ' 
  //         + pred.bbox[2] + 'px; height: '
  //         + pred.bbox[3] + 'px;';

  //     liveView.appendChild(highlighter);
  //     // liveView.appendChild(p);
  //     children.push(highlighter);
  //     // children.push(p);

  //     let car = values["car"] || { start: now, count: 0 , time: now, startPos: pred.bbox, width: pred.bbox[2] };
  //     if ((now - car.time) < 500) {
  //       // same car
  //       car.count += 1;
  //       car.time = now;
  //       car.end = now;
  //       car.endPos = pred.bbox;
  //       if (car.width < pred.bbox[2]) {
  //         car.width = pred.bbox[2]
  //       }
  //       values["car"] = car;
  //       // console.log(pred.bbox[2])
  //     } else {
  //       const lastCar = values["car"];
  //       cars.push(lastCar)
  //       if (lastCar && lastCar.image && lastCar.endPos) {
  //         // logStats(lastCar)
  //         // if (lastCar.realSpeed > 20 && lastCar.realSpeed < 80) {
  //         //   // post(lastCar)
  //         // addCar(lastCar)
  //         // }
  //       }
  //       // console.log('last car ' + (lastCar.end - lastCar.start))
  //       // assume a new car
  //       console.log('---- new car -----')
  //       values["car"] = { start: now, count: 1, time: now, startPos: pred.bbox, width: pred.bbox[2] };
  //       // setTimeout(() => {
  //       //   const {image, canvas} = getScreenshot(video);
  //       //   values["car"].image = image;
  //       //   values["car"].canvas = canvas;
  //       // }, 200);
  //     }
  //     // add(pred.class, car);
  //   } else {
  //     //console.log(pred.class)
  //   }
  // }

  // img.dispose();
  await tf.nextFrame();
  // window.requestAnimationFrame(app);
  // setTimeout(() => {
  //   app();
  // }, 10);

  app();
}

function moved(person, pred) {

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
  scale = scale || .6;  // make image smaller for loki size limit

  const canvas = document.createElement("canvas");
  canvas.width = videoEl.clientWidth * scale;
  canvas.height = videoEl.clientHeight * scale;
  canvas.getContext('2d').drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const image = new Image()
  image.src = canvas.toDataURL();
  return {image, canvas};
}

function logStats(lastCar) {
  if (lastCar && lastCar.endPos) {
  //if (lastCar && lastCar.image && lastCar.endPos) {
    const x1 = lastCar.startPos[0];
    const x2 = lastCar.endPos[0];
    const y1 = lastCar.startPos[1];
    const y2 = lastCar.endPos[2];
    const dist = Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    // console.log('distance ' + dist);

    let width = lastCar.width;

    // 800 px / 7 in wide
    // const PPI = 1024 / 9

    // 640 x 480
    // const PPI = 640 / 8

    // https://www.calculatorsoup.com/calculators/technology/ppi-calculator.php
    // 640 x 480 12 diag in
    //const PPI = 66.67

    // guess
    // const PPI = 122.30 / 2
    const PPI = 800 / 15;  // 53

    const heightInPixels = 100;
    // const heightInInches = 6 * 12;  // 6 foot x 12 in = 72 in

    const heightInInches = 70;  // 6 foot x 12 in = 72 in

    const conversion = heightInInches / heightInPixels;

    const pixelsPerInch = heightInPixels / heightInInches;
    const carLen = width / pixelsPerInch;

    // console.log('car len: ' + carLen / 12);

    const carLength = width * conversion;

    // using height

    const widthInch = width / PPI;

    // use this to convert screen inch to real inch
    const aveCarLength = 192;  // inches
    // const aveCarLength = 177;  // inches

    // use this to scale ( not sure what exactly to use )
    // maybe adjust (calibrate) based on average speed in relation to speed limit?

    // const aveCarLength = 210;  // inches

    // const carLength = widthInch * aveCarLength;
    // console.log('car length ' + (carLength / 12))
    const time = lastCar.end - lastCar.start;
    // const inchDist = dist / PPI;
    // console.log('inch dist ' + inchDist);
    const inchDist = dist / conversion;
    const feet = inchDist / 12;
    // scale screen inches to real inches
    // const realInches = inchDist * aveCarLength;
    // const feet = realInches / 12;

    // console.log('real inch dist ' + realInches)
    // should be 85 from office window
    // const feet = carLength / 12;
    // console.log('feet ' + feet)
    const seconds = time / 1000;
    // console.log('seconds ' + seconds);

    const feetPerSecond = feet / seconds;

    // console.log('FPS ' + feetPerSecond)

    // convert feet per second to mph
    const mph = feetPerSecond / 1.467;

    lastCar.realSpeed = mph;
    lastCar.distanceInFeet = feet;
    lastCar.distanceInPixels = dist;
    lastCar.seconds = seconds;
    lastCar.totalSeconds = lastCar.totalTime / 1000;

    console.log('mph: ' + mph + ' feet: ' + feet + ' second: ' + seconds + ' count: ' + lastCar.count + ' totalsecs: ' + lastCar.totalSeconds)
  }
}

function addCar(car) {
  // const totalEl = document.getElementById('total');
  // totalEl.innerHTML = cars.length;
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

async function postToLoki(car) {
  // console.log('posting to loki')
  // const image = car.image.src.split(',')[1]
  car.name = new Date().getTime();
  // const url = `http://localhost:8082/cars/${car.name}.png`;
  // const body = `speed mph=${car.realSpeed},car="${url}"`;

  const canvas = car.canvas;
  if (car.realSpeed > SPEED_LIMIT + 10 ) {
    const image = canvas.toDataURL();
    car.image = image;
  }

  car.lat = geo.coords.latitude;
  car.lng = geo.coords.longitude;

    // const formData = new FormData();
    // formData.append('car', blob, `${car.name}.png`);
    // const res = await fetch('http://localhost:8082/upload', {
    //   method: 'POST',
    //   body: formData
    // });
    // const rawResponse = await res.json()
    // // const content = await rawResponse.json();
    // console.log(rawResponse);

  const body = JSON.stringify(car);

  const app = { app: "optycop" }

  const time = new Date();
  const unixTimestamp = Math.floor(time.getTime() / 1000);

  const payload = {
    streams: [
      {
        stream: app,
        values: [
            [`${unixTimestamp}000000000`, body]
        ]
      }
    ]
  }

  const paystr = JSON.stringify(payload);
  // console.log(paystr)

  // console.log('posting to loki')
  //https://logs-prod3.grafana.net/loki/api/v1/push
  const url = 'http://localhost:8010/proxy/loki/api/v1/push'
  const rawResponse = await fetch(url, {
    method: 'POST',
    headers: {
      // mode: 'no-cors',
      'Accept': 'text/plain',
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + btoa('242200' + ':' + 'token')
    },
    body: paystr
  });

  console.log('posted to loki');
  // upload image
  // const canvas = car.canvas;
  // canvas.toBlob(async function(blob) {
  //   const formData = new FormData();
  //   formData.append('car', blob, `${car.name}.png`);
  //   const res = await fetch('http://localhost:8082/upload', {
  //     method: 'POST',
  //     body: formData
  //   });
  //   const rawResponse = await res.json()
  //   // const content = await rawResponse.json();
  //   console.log(rawResponse);
  // });
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
    video: { facingMode: "environment" }
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
    video.srcObject = stream;
    video.addEventListener('loadeddata', app);
  });
}