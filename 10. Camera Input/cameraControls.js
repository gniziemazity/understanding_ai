class CameraControls {
   constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.tmpCanvas = document.createElement("canvas");
      this.tmpCtx = this.tmpCanvas.getContext("2d");

      this.tilt = 0;
      this.forward = true;
      this.reverse = false;

      this.initializing = true;
      this.expectedSize = 0;

      this.markerDetector = new MarkerDetector();

      navigator.mediaDevices.getUserMedia({ video: true })
         .then((rawData) => {
            this.video = document.createElement("video");
            this.video.srcObject = rawData;
            this.video.play();
            this.video.onloadeddata = () => {
               this.canvas.width = this.video.videoWidth / 4;
               this.canvas.height = this.video.videoHeight / 4;
               this.tmpCanvas.width = this.canvas.width;
               this.tmpCanvas.height = this.canvas.height;
               this.#loop();
            };
         })
         .catch((err) => {
            alert(err);
         });

      this.canvas.addEventListener("wheel", (event) => {
         this.markerDetector.updateThreshold(-Math.sign(event.deltaY));
      });
   }

   #processMarkers({ leftMarker, rightMarker }) {
      this.tilt = Math.atan2(
         rightMarker.centroid.y - leftMarker.centroid.y,
         rightMarker.centroid.x - leftMarker.centroid.x
      );

      if (this.initializing) {
         this.expectedSize = (leftMarker.radius + rightMarker.radius) / 2;
      }
      const size = (leftMarker.radius + rightMarker.radius) / 2;
      if (size < this.expectedSize * 0.85) {
         this.forward = false;
         this.reverse = true;
      } else {
         this.reverse = false;
         this.forward = true;
      }

      const wheelCenter = average(
         leftMarker.centroid,
         rightMarker.centroid
      );
      const wheelRadius = distance(wheelCenter, leftMarker.centroid);

      this.ctx.beginPath();
      this.ctx.fillStyle = this.forward ? "blue" : "red";
      this.ctx.arc(
         wheelCenter.x,
         wheelCenter.y,
         wheelRadius,
         0,
         Math.PI * 2
      );
      this.ctx.fill();
   }

   #loop() {
      this.initializing = !started;

      this.ctx.save();
      this.ctx.translate(this.canvas.width, 0);
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
      const imgData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
      const res = this.markerDetector.detect(imgData);
      if (res) {
         this.#processMarkers(res);

         for (let i = 0; i < imgData.data.length; i += 4) {
            imgData.data[i + 3] = 0;
         }
         
         for (const point of [...res.leftMarker.points, ...res.rightMarker.points]) {
            const index = (point.y * imgData.width + point.x) * 4;
            imgData.data[index + 3] = 255;
         }

         this.tmpCtx.putImageData(imgData, 0, 0);
         this.ctx.drawImage(this.tmpCanvas, 0, 0);
      }
      requestAnimationFrame(() => this.#loop());
   }
}