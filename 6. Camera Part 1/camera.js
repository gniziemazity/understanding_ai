class Camera {
   constructor({ x, y, angle }, range = 1000) {
      this.range = range;
      this.move({ x, y, angle });
   }

   move({ x, y, angle }) {
      this.x = x;
      this.y = y;
      this.z = -20;
      this.angle = angle;
      this.center = new Point(this.x, this.y);
      this.tip = new Point(
         this.x - this.range * Math.sin(this.angle),
         this.y - this.range * Math.cos(this.angle)
      );
      this.left = new Point(
         this.x - this.range * Math.sin(this.angle - Math.PI / 4),
         this.y - this.range * Math.cos(this.angle - Math.PI / 4)
      );
      this.right = new Point(
         this.x - this.range * Math.sin(this.angle + Math.PI / 4),
         this.y - this.range * Math.cos(this.angle + Math.PI / 4)
      );
      this.poly = new Polygon([
         this.center, this.left, this.right
      ]);
   }

   #projectPoint(ctx, p) {
      const seg = new Segment(this.center, this.tip);
      const { point: p1 } = seg.projectPoint(p);
      const c = cross(subtract(p1, this), subtract(p, this));
      const x = Math.sign(c) * distance(p, p1) / distance(this, p1);
      const y = - this.z / distance(this, p1);

      const cX = ctx.canvas.width / 2;
      const cY = ctx.canvas.height / 2;
      const scaler = Math.max(cX, cY);
      return new Point(cX + x * scaler, cY + y * scaler);
   }

   #filter(polys) {
      const filteredPolys = [];
      for (const poly of polys) {
         if (!this.poly.containsPoly(poly)) {
            continue;
         }

         if (poly.intersectsPoly(this.poly)) {
            const copy1 = new Polygon(poly.points);
            const copy2 = new Polygon(this.poly.points);
            Polygon.break(copy1, copy2, true);
            const points = copy1.segments.map((s) => s.p1);
            const filteredPoints = points.filter(
               (p) => p.intersection || this.poly.containsPoint(p)
            );
            filteredPolys.push(new Polygon(filteredPoints));
         } else {
            filteredPolys.push(poly);
         }
      }
      return filteredPolys;
   }

   render(ctx, world) {
      const polys = this.#filter(world.buildings.map((b) => b.base));

      const projPolys = polys.map(
         (poly) => new Polygon(
            poly.points.map((p) => this.#projectPoint(ctx, p))
         )
      );

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      for (const poly of projPolys) {
         poly.draw(ctx);
      }

      for (const poly of polys) {
         poly.draw(carCtx);
      }
   }

   draw(ctx) {
      this.poly.draw(ctx);
   }
}