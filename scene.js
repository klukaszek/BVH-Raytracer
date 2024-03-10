// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3

// Create a cube with the given dimensions
class BVHNode {
  constructor(boundingBox, left, right, object) {
    this.boundingBox = boundingBox; /// min and max bounds of the bounding box
    this.left = left;   // left child or null for leaf
    this.right = right; // right child or null for leaf
    this.object = object; // object in the leaf node
  }

  // Check if a ray intersects the bounding box, and if it happens to be a leaf node we get the pixel colour and distance from the object
  intersects(scene, rayOrigin, rayDirection) {

    // If no intersection with the bounding box, return null
    if (!this.boundingBoxIntersect(rayOrigin, rayDirection)) {
      return null;
    }

    // If the node is a leaf, check if the ray intersects the object and return the result (pixel colour and distance)
    if (this.object) {

      let info = this.object.raytrace(scene, rayOrigin, rayDirection);
      return info;
    }

    // Check both children for intersections with the ray
    let leftLeaf = this.left.intersects(scene, rayOrigin, rayDirection);
    
    // Otherwise, we return the right leaf
    if (leftLeaf != null) {
      let rightLeaf = this.right.intersects(scene, rayOrigin, rayDirection);

      // If the right leaf is closer, return it
      if (rightLeaf != null) {
        if (rightLeaf.dist < leftLeaf.dist) {
          return rightLeaf;
        }
      }

      return leftLeaf;

    } else {
      return this.right.intersects(scene, rayOrigin, rayDirection);
    }
  }

  // Check if a ray intersects the bounding box
  boundingBoxIntersect(rayOrigin, rayDirection) {

    // Calculate intersection parameters (t-values) for the x-axis
    let tmin = (this.boundingBox.min[0] - rayOrigin[0]) / rayDirection[0];
    let tmax = (this.boundingBox.max[0] - rayOrigin[0]) / rayDirection[0];

    // Ensure tmin is the minimum and tmax is the maximum
    if (tmin > tmax) {
      let temp = tmin;
      tmin = tmax;
      tmax = temp;
    }

    // Calculate intersection parameters (t-values) for the y-axis
    let tymin = (this.boundingBox.min[1] - rayOrigin[1]) / rayDirection[1];
    let tymax = (this.boundingBox.max[1] - rayOrigin[1]) / rayDirection[1];

    // Ensure tymin is the minimum and tymax is the maximum
    if (tymin > tymax) {
      let temp = tymin;
      tymin = tymax;
      tymax = temp;
    }

    // Check for no intersection along the y-axis
    if ((tmin > tymax) || (tymin > tmax)) {
      return false;
    }

    // Update tmin and tmax based on y-axis intersection
    if (tymin > tmin) {
      tmin = tymin;
    }

    if (tymax < tmax) {
      tmax = tymax;
    }

    // Calculate intersection parameters (t-values) for the z-axis
    let tzmin = (this.boundingBox.min[2] - rayOrigin[2]) / rayDirection[2];
    let tzmax = (this.boundingBox.max[2] - rayOrigin[2]) / rayDirection[2];

    // Ensure tzmin is the minimum and tzmax is the maximum
    if (tzmin > tzmax) {
      let temp = tzmin;
      tzmin = tzmax;
      tzmax = temp;
    }

    // Check for no intersection along the z-axis
    if ((tmin > tzmax) || (tzmin > tmax)) {
      return false;
    }

    // Update tmin and tmax based on z-axis intersection
    if (tzmin > tmin) {
      tmin = tzmin;
    }

    if (tzmax < tmax) {
      tmax = tzmax;
    }

    // If all axes have valid intersection intervals, the ray intersects the AABB
    return true;

  }
}

function buildBVHSpheres(spheres) {
  if (spheres.length == 0) return null;

  // If only one sphere, return a new leaf node with the sphere as the object
  if (spheres.length == 1) {
    let boundingBox = calculateBoundingBox(spheres);
    return new BVHNode(boundingBox, null, null, spheres[0]);
  }

  // Get the bounding box for the spheres and then partition them
  let boundingBox = calculateBoundingBox(spheres);
  let partitionedSpheres = partitionSpheres(spheres, boundingBox);

  let left = buildBVHSpheres(partitionedSpheres.left);
  let right = buildBVHSpheres(partitionedSpheres.right);

  // Create new node from partitions
  return new BVHNode(boundingBox, left, right, null);
}

function calculateBoundingBox(spheres) {

  // We have use infinity because Number.MIN_VALUE -> 0 from the right side
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  // Find the minimum and maximum bounds of the spheres
  for (let sphere of spheres) {

    let minExt = sphere.getMinExtent();
    let maxExt = sphere.getMaxExtent();

    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], minExt[i]);
      max[i] = Math.max(max[i], maxExt[i]);
    }
  }

  return { min: min, max: max };
}

function partitionSpheres(spheres, boundingBox) {
  console.log(spheres.length);
  if (spheres.length === 0) return { left: [], right: [] };

  let min = boundingBox.min;
  let max = boundingBox.max;

  // Determine the longest axis
  let extents = vec3.subtract([], max, min);
  let longestAxis = extents.indexOf(Math.max(...extents));

  // Sort the spheres by the longest axis
  // Important because it determines how the spheres are disributed in the BVH tree
  spheres.sort((a, b) => a.position[longestAxis] - b.position[longestAxis]);

  // Split the sorted list of spheres into two halves
  let middle = Math.floor(spheres.length / 2);
  let left = spheres.slice(0, middle);
  let right = spheres.slice(middle);

  return { left: left, right: right };
}

class Sphere {
  constructor() {
    this.position = vec3.create();
    this.radius = 0.0;
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
  }

  // return min aabb extent
  getMinExtent() {
    return vec3.subtract([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
  }

  // return max aabb extent
  getMaxExtent() {
    return vec3.add([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
  }

  // Ray trace a given point on a sphere
  raytrace(scene, rayOrigin, rayDirection) {

    let intersection = this.sphereIntersect(rayOrigin, rayDirection);

    let pixel = null;

    let dist = Number.MAX_VALUE;
    if (intersection != null) {
      dist = vec3.distance(rayOrigin, intersection);
      pixel = this.calculateShading(intersection, rayOrigin, scene.lights);
    }

    return { pixel: pixel, dist: dist };
  }

  // Return the intersection point of a ray with the sphere
  sphereIntersect(rayOrigin, rayDirection) {

    let a = 1.0;
    let oc = vec3.subtract([], rayOrigin, this.position);
    let b = 2.0 * vec3.dot(rayDirection, oc);
    let c = vec3.dot(oc, oc) - this.radius * this.radius;
    let discriminant = b * b - 4.0 * a * c;

    // If a root exists, return the intersection point
    if (discriminant > 0) {
      return intersectPoint(rayOrigin, rayDirection, a, b, discriminant);
    } else if (discriminant == 0) {
      return null;
    }
  }

  // Determine the shading at a given intersection point
  calculateShading(intersection, rayOrigin, lights) {

    let center = this.position;

    let normal = vec3.normalize([], vec3.subtract([], intersection, center));
    let view = vec3.normalize([], vec3.subtract([], rayOrigin, intersection));

    let result = vec3.fromValues(0, 0, 0);
    for (let i = 0; i < lights.length; i++) {

      let pixel = vec3.fromValues(0, 0, 0);
      let lightPos = lights[i].position;
      let lightAmbient = lights[i].la;
      let lightColor = lights[i].lp;

      let lightDir = vec3.normalize([], vec3.subtract([], lightPos, intersection));

      let ambientColor = vec3.multiply([], this.ambient, lightAmbient);

      // Calculate the diffuse component
      let nDotL = vec3.dot(normal, lightDir);
      let diffuseColor = vec3.multiply([], this.diffuse, lightColor);
      vec3.scale(diffuseColor, diffuseColor, nDotL);

      // Calculate the reflection direction
      let temp = 2.0 * nDotL;
      let reflectDir = vec3.scale([], normal, temp);
      vec3.subtract(reflectDir, reflectDir, lightDir);
      vec3.normalize(reflectDir, reflectDir);

      // Calculate the specular component
      let spec = Math.pow(Math.max(vec3.dot(view, reflectDir), 0), this.shiny);
      let specularColor = vec3.multiply([], this.specular, lightColor);
      vec3.scale(specularColor, specularColor, spec);

      // Add the ambient, diffuse, and specular components to the pixel
      vec3.add(pixel, pixel, ambientColor);
      vec3.add(pixel, pixel, diffuseColor);
      vec3.add(pixel, pixel, specularColor);

      // Add light contribution to the result
      vec3.add(result, result, pixel);
    }

    // Multiply the pixel by 255 to get the final color for canvas
    vec3.multiply(result, result, vec3.fromValues(255.0, 255.0, 255.0));
    return result;
  }
}

class PointLight {
  constructor() {
    this.position = vec3.create();
    this.la = vec3.create(); // ambient colour
    this.lp = vec3.create(); // point light colour
  }
}

class Mesh {
  constructor() {
    this.obj = new Obj();
    this.transform = mat4.create();
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
    //this.bvh = new BVH();
  }

  // I was having trouble with raytracing the mesh in the shaders, so I decided to raytrace the mesh in js
  raytrace(scene, x, y) {

    let rayOrigin = scene.camera.getPosition();
    let rayDirection = getRayDirection(scene, x, y);

    let intersection = this.intersectRayTriangle(rayOrigin, rayDirection);

    let pixel = null
    let dist = Number.MAX_VALUE;
    if (intersection != null) {
      pixel = this.calculateShading(intersection.point, rayOrigin, scene.lights, intersection.normal);
      dist = vec3.distance(rayOrigin, intersection.point);
    }

    return { pixel: pixel, dist: dist };
  }

  // Calculate the shading for the current pixel
  calculateShading(intersection, rayOrigin, lights, normal) {

    let view = vec3.normalize([], vec3.subtract([], rayOrigin, intersection));

    let result = vec3.fromValues(0, 0, 0);
    for (let i = 0; i < lights.length; i++) {

      let pixel = vec3.fromValues(0, 0, 0);
      let lightPos = lights[i].position;
      let lightAmbient = lights[i].la;
      let lightColor = lights[i].lp;

      let lightDir = vec3.normalize([], vec3.subtract([], lightPos, intersection));

      let ambientColor = vec3.multiply([], this.ambient, lightAmbient);

      // Calculate the diffuse component
      let nDotL = vec3.dot(normal, lightDir);
      let diffuseColor = vec3.multiply([], this.diffuse, lightColor);
      vec3.scale(diffuseColor, diffuseColor, nDotL);

      // Calculate the reflection direction
      let temp = 2.0 * nDotL;
      let reflectDir = vec3.scale([], normal, temp);
      vec3.subtract(reflectDir, reflectDir, lightDir);
      vec3.normalize(reflectDir, reflectDir);

      // Calculate the specular component
      let spec = Math.pow(Math.max(vec3.dot(view, reflectDir), 0), this.shiny);
      let specularColor = vec3.multiply([], this.specular, lightColor);
      vec3.scale(specularColor, specularColor, spec);

      // Add the ambient, diffuse, and specular components to the pixel
      vec3.add(pixel, pixel, ambientColor);
      vec3.add(pixel, pixel, diffuseColor);
      vec3.add(pixel, pixel, specularColor);

      // Add light contribution to the result
      vec3.add(result, result, pixel);
    }

    // Multiply the pixel by 255 to get the final color for canvas 
    vec3.multiply(result, result, vec3.fromValues(255.0, 255.0, 255.0));
    return result;
  }

  // Return the intersection point of a ray with the meshes
  intersectRayTriangle(rayOrigin, rayDirection) {

    let closestIntersection = null;
    let closestDist = Number.MAX_VALUE;

    for (let i = 0; i < this.obj.vertices.length; i += 9) {

      let v0 = this.obj.vertices.slice(i, i + 3);
      let v1 = this.obj.vertices.slice(i + 3, i + 6);
      let v2 = this.obj.vertices.slice(i + 6, i + 9);

      let n0 = this.obj.normals.slice(i, i + 3);
      let n1 = this.obj.normals.slice(i + 3, i + 6);
      let n2 = this.obj.normals.slice(i + 6, i + 9);

      let intersection = this.MollerTrumbore(rayOrigin, rayDirection, v0, v1, v2, n0, n1, n2);
      // Return the closest intersection point found
      if (intersection != null) {
        let dist = vec3.distance(rayOrigin, intersection);
        if (dist < closestDist) {
          closestDist = dist;
          closestIntersection = { point: intersection, normal: this.interpolateNormal(intersection, v0, v1, v2, n0, n1, n2) };
        }
      }
    }

    return closestIntersection;
  }


  // Find if a ray intersects a triangle
  MollerTrumbore(rayOrigin, rayDirection, v0, v1, v2) {
    var epsilon = 0.000001;

    // Find edges of the triangle
    var edge1 = vec3.subtract([], v1, v0);
    var edge2 = vec3.subtract([], v2, v0);

    // Calculate determinant
    var h = vec3.cross([], rayDirection, edge2);
    var a = vec3.dot(edge1, h);

    // If determinant is near zero, ray lies in plane of triangle
    if (a > -epsilon && a < epsilon) {
      return null;
    }

    var f = 1 / a;
    var s = vec3.subtract([], rayOrigin, v0);
    var u = f * vec3.dot(s, h);

    if (u < 0 || u > 1) {
      return null;
    }

    var q = vec3.cross([], s, edge1);
    var v = f * vec3.dot(rayDirection, q);

    if (v < 0 || u + v > 1) {
      return null;
    }

    var t = f * vec3.dot(edge2, q);

    if (t > epsilon) {
      var intersectionPoint = vec3.scaleAndAdd([], rayOrigin, rayDirection, t);

      return intersectionPoint;
    } else {
      return null;
    }
  }

  // Interpolate the normal at the intersection point
  interpolateNormal(intersectionPoint, v0, v1, v2, n0, n1, n2) {

    let barycentric = this.getBarycentricCoordinates(intersectionPoint, v0, v1, v2);
    let normal = vec3.create();

    vec3.scaleAndAdd(normal, normal, n0, barycentric[0]);
    vec3.scaleAndAdd(normal, normal, n1, barycentric[1]);
    vec3.scaleAndAdd(normal, normal, n2, barycentric[2]);
    vec3.normalize(normal, normal);

    return normal;
  }

  // Calculate the barycentric coordinates of a point on a triangle so that we can interpolate the normals
  getBarycentricCoordinates(intersectionPoint, v0, v1, v2) {
    let edge1 = vec3.subtract([], v1, v0);
    let edge2 = vec3.subtract([], v2, v0);
    let edge3 = vec3.subtract([], intersectionPoint, v0);

    let dot11 = vec3.dot(edge1, edge1);
    let dot12 = vec3.dot(edge1, edge2);
    let dot22 = vec3.dot(edge2, edge2);
    let dot31 = vec3.dot(edge3, edge1);
    let dot32 = vec3.dot(edge3, edge2);

    let invDenom = 1 / (dot11 * dot22 - dot12 * dot12);

    let barycentric = vec3.create();

    barycentric[1] = (dot22 * dot31 - dot12 * dot32) * invDenom;
    barycentric[2] = (dot11 * dot32 - dot12 * dot31) * invDenom;
    barycentric[0] = 1 - barycentric[1] - barycentric[2];

    return barycentric;
  }
}

class Scene {
  constructor() {
    this.canvas = document.querySelector(".myCanvas");
    this.lights = [];
    this.spheres = []
    this.meshes = [];
    this.bvhs = [];
    this.c = 0;
    this.camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1), 60.0 * Math.PI / 180, null, 0.01, 100.0);
    this.camera.setAspect(this.canvas.width / this.canvas.height);
    this.camera.update();
    this._loadedObjs = [];
  }

  /* ---------------------------- Scene Helpers -------------------------------*/

  // Load a scene description from an input file
  loadSceneInfo(sceneFile) {
    this.lights = [];
    this.meshes = [];
    this.c = 0;

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
          console.error(error);
          //console.error("Error: Failed to read scene line " + (i+1) + ". Make sure the format is correct.");
        }

        if (!failed) {
          this.spheres.push(sphere);
        }

      } else if (lineType.toLowerCase() === "mesh".toLowerCase()) {

        let failed = false;
        let mesh = new Mesh();

        try {
          let t, rot, scale, a, d, s, shiny;

          // Get the transformation matrix components
          t = parts.slice(0, 3);
          rot = parts.slice(3, 6);
          scale = parts[6];

          // Get the material coefficients
          a = parts.slice(7, 10);
          d = parts.slice(10, 13);
          s = parts.slice(13, 16);
          shiny = parseFloat(parts[16]);

          // Using t, rot, and scale, create a transformation matrix for the mesh
          let transform_matrix = createTransformMatrix(t, rot, scale);

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
          this.meshes.push(mesh);
        }

      } else {
        console.error("Error: Invalid scene description at line " + (i + 1) + ".");
      }
    });

    // Sort the spheres by distance from the camera
    this.sortSpheresByDistance();
  }

  // Ray trace the scene
  raytrace() {

    let depth = Array.from({ length: this.canvas.width * this.canvas.height }, () => Number.MAX_VALUE);
    let ctx = this.canvas.getContext("2d");

    let rayOrigin = this.camera.getPosition();

    // Iterate over each pixel in the canvas and ray trace for each pixel
    for (let y = 0; y < this.canvas.height; y++) {
      for (let x = 0; x < this.canvas.width; x++) {

        // Calculate the ray direction for the current pixel
        let rayDirection = getRayDirection(this, x, y);

        let index = y * this.canvas.width + x;

        // If a BVH exists, use it to intersect the ray with the scene
        for (let i = 0; i < this.bvhs.length; i++) {
          let intersection = this.bvhs[i].intersects(this, rayOrigin, rayDirection);

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


        // // Iterate over each mesh in the scene and ray trace for each mesh 
        // for (let i = 0; i < this.meshes.length; i++) {
        //   let info = this.meshes[i].raytrace(this, x, y);
        //
        //   let pixel = info.pixel;
        //
        //   let dist = info.dist;
        //
        //   let index = y * this.canvas.width + x;
        //
        //   // If the distance to the intersection point is less than the current depth, set the pixel
        //   if (dist < depth[index]) {
        //     depth[index] = dist;
        //     let r = pixel[0];
        //     let g = pixel[1];
        //     let b = pixel[2];
        //     setPixel(ctx, x, y, r, g, b);
        //   }
        // }
      }
    }
  }

  // Clear the scene
  clearScene() {
    this.lights = [];
    this.spheres = []
    this.meshes = [];
    this.bvhs = [];
    this.c = 0;
    this.camera = new Camera(vec3.fromValues(0, 0, 0), vec3.fromValues(1, 1, 1), 60.0 * Math.PI / 180, null, 0.01, 100.0);
    this.camera.setAspect(this.canvas.width / this.canvas.height);
    this.camera.update();
    this._loadedObjs = [];
  }

  // Load a mesh from a file into the scene.
  async loadObj(filename, obj_contents) {

    console.log("Loading mesh from file: " + filename);

    let obj = initObj(filename, obj_contents);

    // Append the loaded object to the list of loaded objects
    this._loadedObjs.push(obj);

    if (this.meshes.length > 0) {
      this.assignAsMesh();
    }
  }

  // Get any property from an object within the scene (primitive or mesh)
  getObjectProperty(propertyName, objects) {
    const result = [];
    objects.forEach(object => {
      result.push(object[propertyName]);
    });
    return result;
  }

  /* ---------------------- Light Scene Helpers -----------------------------*/

  /* ---------------------- Sphere Scene Helpers -----------------------------*/

  // Sort spheres before passing to shader to avoid resorting on every shader pass
  // We use this to avoid any problems with the shader drawing the spheres in the wrong order
  // To implement transparency, we might have to make some adjustments to our scene description
  sortSpheresByDistance() {
    this.spheres.sort((a, b) => {
      let cam_pos = this.camera.getPosition();
      return vec3.distance(cam_pos, a.position) - vec3.distance(cam_pos, b.position);
    });
  }

  /* ---------------------- Object Scene Helpers -----------------------------*/

  // In the event that the obj files have not loaded on time, set the mesh's obj to the last loaded obj
  // Ultimately the goal is to include a name for the obj file in the scene description 
  // and then I can use that to assign the obj to the mesh when the obj is loaded
  assignAsMesh() {
    this.meshes.forEach(mesh => {
      mesh.obj = this._loadedObjs[this._loadedObjs.length - 1];
    });
  }

  // Apply the mesh transformation matrix to the vertices of the associated obj
  transformMeshes() {

    // If no objs have been loaded but a mesh has been added to the scene, return and do nothing since there is nothing to transform
    if (this._loadedObjs.length === 0) return;

    this.meshes.forEach(mesh => {
      for (let i = 0; i < mesh.obj.vertices.length; i += 3) {
        let vertex = vec3.fromValues(mesh.obj.vertices[i], mesh.obj.vertices[i + 1], mesh.obj.vertices[i + 2]);
        vec3.transformMat4(vertex, vertex, mesh.transform);
        mesh.obj.vertices[i] = vertex[0];
        mesh.obj.vertices[i + 1] = vertex[1];
        mesh.obj.vertices[i + 2] = vertex[2];

        // Apply the transformation matrix to the normals as well
        let normal = vec3.fromValues(mesh.obj.normals[i], mesh.obj.normals[i + 1], mesh.obj.normals[i + 2]);
        vec3.transformMat4(normal, normal, mesh.transform);
        vec3.scale(normal, normal, -1);

        mesh.obj.normals[i] = normal[0];
        mesh.obj.normals[i + 1] = normal[1];
        mesh.obj.normals[i + 2] = normal[2];
      }
    });
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

// Return the ray direction for a given pixel on the scene canvas
function getRayDirection(scene, x, y) {

  let ndcX = (2.0 * x / scene.canvas.width) - 1.0;
  let ndcY = 1.0 - (2.0 * y / scene.canvas.height);

  let tanHalfFov = Math.tan(scene.camera.fov / 2.0);
  let offsetX = tanHalfFov * scene.camera.aspect * ndcX;
  let offsetY = tanHalfFov * ndcY;

  let rayDirection = vec3.fromValues(offsetX, offsetY, -1.0);

  vec3.normalize(rayDirection, rayDirection);

  return rayDirection;
}

// Return the intersection point of a ray with an object
function intersectPoint(rayOrigin, rayDirection, a, b, discriminant) {
  let t0, t1;

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
