// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3

/* ---------------------- Scene -----------------------------*/

class Scene {
  constructor() {
    this.canvas = null;
    this.width = 0;
    this.height = 0;
    this.lights = [];
    this.objects = [];
    this.bvh = null;
    this.c = 0;
    this.camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1), 60.0 * Math.PI / 180, null, 0.01, 100.0);
    this.camera.update();
    this._loadedObjs = [];
  }

  /* ---------------------------- Scene Helpers -------------------------------*/

  // Load a scene description from an input file
  loadSceneInfo(sceneFile) {
    this.c = 0;

    // Clear the scene before loading a new one
    this.clearScene();

    // Assign the canvas and its dimensions to the scene so the web worker can access these values
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    this.camera.setAspect(this.canvas.width / this.canvas.height);

    // Split file contents into lines array. Filter out empty strings.
    let lines = sceneFile.split("\n");
    lines = lines.filter((item) => item != "");

    lines.forEach((line, i) => {
      // Split each line into tokens
      const parts = line.trim().split(/\s+/);

      // Remove first token from parts and use it as the line type (light, #c, sphere, mesh)
      const lineType = parts.shift();

      // Check if we are parsing a line
      if (lineType.toLowerCase() === "light".toLowerCase()) {
        let light = new PointLight();
        let failed = false;

        try {
          let p = parts.slice(0, 3);
          let la = parts.slice(3, 6);
          let lp = parts.slice(6, 9);

          light.position = vec3.fromValues(...p);
          light.la = vec3.fromValues(...la);
          light.lp = vec3.fromValues(...lp);

        } catch (error) {
          failed = true;
          console.error("Error reading file. Make sure the format is correct.");
        }

        if (!failed) {
          this.lights.push(light);
        }

        // Check if we are parsing the number of spheres
      } else if (lineType !== "" && isNumber(lineType)) {
        let val = parseInt(lineType);
        if (val >= 0 && val <= 10) {
          this.c = val;
        } else {
          console.error("Error: Number of spheres out of range (0 <= c <= 10)");
          return;
        }
        // Check if we are parsing a sphere
      } else if (lineType.toLowerCase() === "sphere".toLowerCase()) {

        let failed = false;
        let sphere = new Sphere();

        try {

          let p, a, d, s;

          // Get position
          p = parts.slice(0, 3);
          sphere.position = vec3.fromValues(...p);

          // Get radius
          sphere.radius = parseFloat(parts[3]);

          // Get ambient coefficient
          a = parts.slice(4, 7);
          sphere.ambient = vec3.fromValues(...a);

          // Get diffuse coefficient
          d = parts.slice(7, 10);
          sphere.diffuse = vec3.fromValues(...d);

          // Get specular coefficient
          s = parts.slice(10, 13);
          sphere.specular = vec3.fromValues(...s);

          // Set shininess value
          sphere.shiny = parseFloat(parts[13]);

          i += 1;
        } catch (error) {
          failed = true;
          console.error("Error: Failed to read scene line " + (i + 1) + ". Make sure the format is correct.");
        }

        if (!failed) {
          this.objects.push(sphere);
        }

      } else if (lineType.toLowerCase() === "mesh".toLowerCase()) {

        let failed = false;
        let mesh = new Mesh();

        try {
          let p, rot, scale, a, d, s, shiny;

          // Get the transformation matrix components
          p = parts.slice(0, 3);
          rot = parts.slice(3, 6);
          scale = parts[6];

          // Get the material coefficients
          a = parts.slice(7, 10);
          d = parts.slice(10, 13);
          s = parts.slice(13, 16);
          shiny = parseFloat(parts[16]);

          // Using p, rot, and scale, create a transformation matrix for the mesh
          let transform_matrix = createTransformMatrix(p, rot, scale);

          // Set the position, rotation, and scale of the mesh
          mesh.position = vec3.fromValues(...p);
          mesh.rotation = vec3.fromValues(...rot);
          mesh.scale = scale;

          // Set the transformation matrix
          mesh.transform = transform_matrix;

          // Set the ambient coefficient
          mesh.ambient = vec3.fromValues(...a);

          // Set the diffuse coefficient
          mesh.diffuse = vec3.fromValues(...d);

          // Set the specular coefficient
          mesh.specular = vec3.fromValues(...s);

          // Set the shininess value
          mesh.shiny = shiny;

          // In the event that the obj files have loaded on time, set the mesh's obj to the last loaded obj
          if (this._loadedObjs.length > 0) {
            mesh.obj = this._loadedObjs[this._loadedObjs.length - 1];
          } else {
            this.assignAsMesh();
          }

        } catch (error) {
          failed = true;
          console.error("Error: Failed to read scene line " + (i + 1) + ". Make sure the format is correct.");
        }

        // Add the mesh to the scene if all goes well
        if (!failed) {
          this.objects.push(mesh);
        }

      } else {
        console.error("Error: Invalid scene description at line " + (i + 1) + ".");
      }
    });
  }

  // Cast rays through the scene and render any intersections as pixels on the canvas
  raytrace() {

    let ctx = this.canvas.getContext("2d");
    let depth = Array.from({ length: this.width * this.height }, () => Number.MAX_VALUE);

    let rayOrigin = this.camera.getPosition();

    // Iterate over each pixel in the canvas and ray trace for each pixel
    for (let y = 0; y < this.canvas.height; y++) {

      if (y % 50 === 0) console.log("Ray tracing is at line " + y + " of " + this.canvas.height + "...");

      for (let x = 0; x < this.canvas.width; x++) {

        // Calculate the ray direction for the current pixel
        let rayDirection = this.camera.getRayDirection(x, y, this.width, this.height);

        // Initialize a new ray with a current recursion depth of 0
        // The max recursion depth is set to 1 globally
        let ray = new Ray(rayOrigin, rayDirection, 0);

        let index = y * this.canvas.width + x;

        // If a BVH exists, use it to intersect the ray with the scene
        let intersection = this.bvh.intersects(this, ray);

        // If the intersection point is not null, set the pixel to what was 
        // returned if the depth is less than the current depth
        if (intersection != null) {

          let pixel = intersection.pixel;
          let dist = intersection.dist;

          // If the distance to the intersection point is less than the current depth, set the pixel
          if (dist < depth[index]) {
            depth[index] = dist;
            let r = pixel[0];
            let g = pixel[1];
            let b = pixel[2];
            setPixel(ctx, x, y, r, g, b);
          }
        }
      }
    }

    console.log("Ray tracing is at line " + this.canvas.height + " of " + this.canvas.height + "...");
    console.log("Ray tracing complete.");
  }

  // Clear the scene
  clearScene() {
    this.lights = [];
    this.objects = [];
    this.bvh = null;
    this.c = 0;
    this.camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1), 60.0 * Math.PI / 180, null, 0.01, 100.0);
    this.camera.setAspect(this.canvas.width / this.canvas.height);
    this.camera.update();
    this._loadedObjs = [];
    let ctx = this.canvas.getContext("2d");

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Load a .obj from a file into the scene.
  async loadObj(filename, obj_contents) {

    console.log("Loading mesh from file: " + filename);

    let obj = initObj(filename, obj_contents);

    // Append the loaded object to the list of loaded objects
    this._loadedObjs.push(obj);

    if (this.objects.length > 0) {
      this.assignAsMesh();
    }
  }

  /* ---------------------- Object Scene Helpers -----------------------------*/

  // Iterate through the objects in the scene and assign 
  // the last loaded obj to the meshes present in the scene
  assignAsMesh() {
    this.objects.forEach(object => {
      if (object instanceof Mesh)
        object.obj = this._loadedObjs[this._loadedObjs.length - 1];
    });
  }

  // Get any property from an object within the scene (primitive or mesh)
  getObjectProperty(propertyName, objects) {
    const result = [];
    objects.forEach(object => {
      result.push(object[propertyName]);
    });
    return result;
  }

  // Sort objects before passing to BVH builder
  sortObjectsByDistance() {
    let cam_pos = this.camera.getPosition();

    this.objects.sort((a, b) => {
      return vec3.distance(cam_pos, a.position) - vec3.distance(cam_pos, b.position);
    });
  }

  // Apply the mesh transformation matrix to the vertices and normals of the associated obj
  transformMeshes() {

    // If no objs have been loaded but a mesh has been added to the scene, return and do nothing since there is nothing to transform
    if (this._loadedObjs.length === 0) return;

    this.objects.forEach(object => {

      // If the object is a mesh, apply the transformation matrix to the vertices and normals
      if (object instanceof Mesh) {
        let mesh = object;
        for (let i = 0; i < mesh.obj.vertices.length; i += 3) {
          // Apply the transformation matrix to the vertices
          let vertex = vec3.fromValues(mesh.obj.vertices[i], mesh.obj.vertices[i + 1], mesh.obj.vertices[i + 2]);
          vec3.transformMat4(vertex, vertex, mesh.transform);
          mesh.obj.vertices[i] = vertex[0];
          mesh.obj.vertices[i + 1] = vertex[1];
          mesh.obj.vertices[i + 2] = vertex[2];

          // Apply the transformation matrix to the normals as well
          let normal = vec3.fromValues(mesh.obj.normals[i], mesh.obj.normals[i + 1], mesh.obj.normals[i + 2]);
          vec3.transformMat4(normal, normal, mesh.transform);
          // Invert the normals
          vec3.scale(normal, normal, -1);
          mesh.obj.normals[i] = normal[0];
          mesh.obj.normals[i + 1] = normal[1];
          mesh.obj.normals[i + 2] = normal[2];
        }
      }
    });
  }

  removeHangingMeshes() {

    let newObjects = [];
    this.objects.forEach(object => {
      if (object instanceof Mesh) {
        if (object.obj !== undefined && object.obj !== null) {
          newObjects.push(object);
        } else {
          console.log("Mesh removed from scene. No obj file associated with mesh. Ray tracing will continue without it.");
        }
      } else {
        newObjects.push(object);
      }
    });
    this.objects = newObjects;

  }
}

/* ---------------------- Helpers -----------------------------*/

function isNumber(val) {
  return !isNaN(val);
}

// Create a transformation matrix for a mesh
function createTransformMatrix(t, rot, scale) {
  let transform_matrix = mat4.create();
  mat4.translate(transform_matrix, transform_matrix, t);
  mat4.rotateX(transform_matrix, transform_matrix, rot[0]);
  mat4.rotateY(transform_matrix, transform_matrix, rot[1]);
  mat4.rotateZ(transform_matrix, transform_matrix, rot[2]);
  mat4.scale(transform_matrix, transform_matrix, vec3.fromValues(scale, scale, scale));
  return transform_matrix;
}

// Return the intersection point of a ray with an object
function intersectPoint(ray, a, b, discriminant) {
  let t0, t1;

  let rayOrigin = ray.origin;
  let rayDirection = ray.direction;

  if (discriminant > 0) {
    //find first root
    t0 = (-b - Math.sqrt(discriminant)) / (2.0 * a);

    // Calculate second root and find closest intersection point
    if (discriminant > 1) {
      // find root 2
      t1 = (-b + Math.sqrt(discriminant)) / (2.0 * a);

      let ri0 = vec3.scaleAndAdd([], rayOrigin, rayDirection, t0);
      let ri1 = vec3.scaleAndAdd([], rayOrigin, rayDirection, t1);

      let dist0 = vec3.distance(rayOrigin, ri0);
      let dist1 = vec3.distance(rayOrigin, ri1);

      // Get minimum between the two distances
      let closest = dist0 < dist1 ? ri0 : ri1;

      // Return the closest intersection point to the ray origin
      if (closest === ri0) {
        return ri0;
      }
      else return ri1;
    }
    // ro + (rd * t0)
    return vec3.scaleAndAdd([], rayOrigin, rayDirection, t0);
  }
}
