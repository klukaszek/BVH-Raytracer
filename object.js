// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3
//
// Description: This file contains the classes for meshes, spheres, and lights 
// This includes the raytracing functions for each object and the shading calculations

const PRIMITIVE = 0;
const MESH = 1;
const LIGHT = 2;

// This is an extended function for gl-matrix
// Clamp all vector values between a minimum and maximum value
vec3.clamp = function(result, min, max) {

  result[0] = result[0] < min ? min : result[0] > max ? max : result[0];
  result[1] = result[1] < min ? min : result[1] > max ? max : result[1];
  result[2] = result[2] < min ? min : result[2] > max ? max : result[2];

  return result;

}

/* ---------------------- SceneObject Class -----------------------------*/

class SceneObject {
  constructor() {
    this.position = vec3.create();
    this.type = PRIMITIVE;
  }

  // This function should return a dictionary with the minimum and maximum bounds of the object as Vec3s
  getExtents() {
    throw new Error('getExtents not implemented for ' + typeof (this));
  }

  // This function should return the intersection point of a ray with the object and the normal of the intersection
  intersects() {
    throw new Error('intersects not implemented for ' + typeof (this));
  }

  // Ray trace a given point on a sphere
  raytrace(scene, ray) {

    // A light scene object is not raytraced
    if (this.type == LIGHT) return null;

    // Get the intersection point and normal of the ray with the sphere
    let intersection = this.intersects(ray);

    // If no info is returned, return null
    if (intersection == null) return null;

    let pixel = null;

    let dist = Number.MAX_VALUE;

    // Return the distance and pixel colour for the intersection point so that 
    // we can assign the pixel colour to the canvas if it passes the depth test
    if (intersection.point != null) {
      dist = intersection.dist;
      pixel = this.calculateShading(scene, intersection.point, ray, intersection.normal);
      return { pixel: pixel, dist: dist };
    }

    // If no intersection, return null
    return null;
  }

  // Calculate the pixel colour for the current pixel of the SceneObject that is being raytraced
  calculateShading(scene, intersection, ray, normal, recursionDepth = 0) {

    // If the object is a light we ignore
    if (this.type == LIGHT) return null;

    // Get the lights in the scene
    let lights = scene.lights;

    // Store the final pixel colour for the intersection point
    let result = vec3.create();

    // Iterate through each light in the scene and add the light contribution to the pixel
    // At the moment, we are only considering 1 point light, however, we can implement light intensity to solve this issue in the future
    for (let i = 0; i < lights.length; i++) {

      let pixel = vec3.create();
      let lightPos = lights[i].position;
      let lightAmbient = lights[i].la;
      let lightColor = lights[i].lp;

      let ambientColor = vec3.create();
      let diffuseColor = vec3.create();
      let specularColor = vec3.create();

      // Calculate the light direction
      let lightDir = vec3.normalize([], vec3.subtract([], lightPos, intersection));

      // Calculate the dot product of the normal and light direction
      let nDotL = vec3.dot(normal, lightDir);

      // Calculate the reflection direction
      let temp = 2.0 * nDotL;
      let reflectDir = vec3.scale([], normal, temp);
      // Here we are calculating the reflection direction from the light direction to determine specular highlights
      vec3.subtract(reflectDir, reflectDir, lightDir);
      vec3.normalize(reflectDir, reflectDir);

      // Get the view direction to the intersection point
      let viewDir = vec3.normalize([], vec3.subtract([], ray.origin, intersection));
      let nDotV = vec3.dot(normal, viewDir);

      // Calculate ambient light
      ambientColor = vec3.multiply([], this.ambient, lightAmbient);

      // Check if the intersection point is in shadow
      if (this.isInShadow(scene, intersection, normal, lightPos)) {
        vec3.add(pixel, pixel, ambientColor);

        // We calculate reflection if the surface has a shiny value that is not 0
        if (this.shiny > 0.0 && recursionDepth < 1) {

          // Recalculate the reflection direction using the view direction instead of the light direction
          // because raytracing is a backwards process and we are calculating the reflection from the view direction
          temp = 2.0 * nDotV;
          reflectDir = vec3.scale([], normal, temp);
          vec3.subtract(reflectDir, reflectDir, viewDir);
          vec3.normalize(reflectDir, reflectDir);
          // Get the reflection color if it exists
          let col = this.calculateReflection(scene, intersection, normal, reflectDir, recursionDepth + 1);

          // apply linear interpolation between the pixel and the reflection color based on the shiny value
          if (col != null) {
            vec3.lerp(pixel, pixel, col, this.shiny);
          }
        }
        
        // Add light contribution to the result
        vec3.add(result, result, pixel);
        continue;
      }

      // Calculate the diffuse component
      diffuseColor = vec3.multiply([], this.diffuse, lightColor);
      vec3.scale(diffuseColor, diffuseColor, nDotL);

      // Calculate the specular component (use a specular exponent of 32.0)
      let spec = Math.pow(Math.max(vec3.dot(reflectDir, viewDir), 0), 32.0);
      specularColor = vec3.multiply([], this.specular, lightColor);
      vec3.scale(specularColor, specularColor, spec);

      // Add ambient, diffuse, and specular components
      vec3.add(pixel, pixel, ambientColor);
      vec3.add(pixel, pixel, diffuseColor);
      vec3.add(pixel, pixel, specularColor);
      vec3.clamp(pixel, 0.0, 1.0);

      // We calculate reflection if the surface has a shiny value that is not 0
      if (this.shiny > 0.0 && recursionDepth < 1) {

        // Recalculate the reflection direction using the view direction instead of the light direction
        // because raytracing is a backwards process and we are calculating the reflection from the view direction
        temp = 2.0 * nDotV;
        reflectDir = vec3.scale([], normal, temp);
        vec3.subtract(reflectDir, reflectDir, viewDir);
        vec3.normalize(reflectDir, reflectDir);

        // Get the reflection color if it exists
        let col = this.calculateReflection(scene, intersection, normal, reflectDir, recursionDepth);

        // apply linear interpolation between the pixel and the reflection color based on the shiny value
        if (col != null) {
          vec3.lerp(pixel, pixel, col, this.shiny);
        }
      }

      // Add light contribution to the result
      vec3.add(result, result, pixel);
    }

    return result;
  }

  // Determine whether an intersection point is in a shadow
  isInShadow(scene, intersection, normal, lightPos) {

    // Get ray from intersection to light
    let rayDirection = vec3.subtract([], lightPos, intersection);
    vec3.normalize(rayDirection, rayDirection);

    let shadowRay = new Ray(intersection, rayDirection);

    // I was getting some "shadow acne" and applying a small offset to the shadow ray origin fixed it
    shadowRay.origin = vec3.scaleAndAdd([], shadowRay.origin, normal, 0.0001);

    // Check if the shadow ray intersects with an object in the BVH tree
    if (scene.bvh.intersects(scene, shadowRay, false)) {
      return true;
    }

    // If no intersection, return false
    return false;
  }

  // Calculate the reflection color of a ray with the object
  calculateReflection(scene, intersection, normal, reflectDir, recursionDepth) {

    // Create a reflection ray using the intersection point and the reflection direction
    let reflectRay = new Ray(intersection, reflectDir);

    // I was getting some "acne" and applying a small offset to the shadow ray origin fixed it
    reflectRay.origin = vec3.scaleAndAdd([], reflectRay.origin, normal, 0.0001);

    // Check if the reflection ray intersects with an object in the BVH tree
    let ref_intersection = scene.bvh.intersects(scene, reflectRay, false);

    // If an intersection is found, calculate the shading for the reflection
    if (ref_intersection != null) {
      let hit_obj = ref_intersection.object;

      // Calculate the shading for the reflection
      let col = hit_obj.calculateShading(scene, ref_intersection.point, reflectRay, ref_intersection.normal, recursionDepth + 1);

      return col;
    }

    // Otherwise, return null
    return null;
  }
}

/* ---------------------- Sphere -----------------------------*/

class Sphere extends SceneObject {
  constructor() {
    super();
    this.radius = 0.0;
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
    this.type = PRIMITIVE;
  }

  // Return the minimum and maximum bounds of the sphere so that it can be used in the BVH
  getExtents() {
    let min = vec3.subtract([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
    let max = vec3.add([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
    return { min: min, max: max };
  }

  // Return the intersection point of a ray with the sphere
  intersects(ray) {
    let rayOrigin = ray.origin;
    let rayDirection = ray.direction;

    let a = 1.0;

    let oc = vec3.subtract([], rayOrigin, this.position);
    let b = 2.0 * vec3.dot(rayDirection, oc);
    let c = vec3.dot(oc, oc) - this.radius * this.radius;
    let discriminant = b * b - 4.0 * a * c;

    // If a root exists, return the intersection point
    if (discriminant >= 0) {
      let intersection = intersectPoint(ray, a, b, discriminant);
      if (intersection == null) return null;
      let normal = vec3.normalize([], vec3.subtract([], intersection, this.position));
      let dist = vec3.distance(rayOrigin, intersection);
      return { point: intersection, normal: normal, dist: dist, object: this };
      // Otherwise, return null
    } else {
      return null;
    }
  }
}

/* ---------------------- Mesh -----------------------------*/

class Mesh extends SceneObject {
  constructor() {
    super();
    this.obj = new Obj();
    this.rotation = vec3.create();
    this.scale = 1.0;
    this.transform = mat4.create();
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
    this.type = MESH;
  }

  // Return the minimum and maximum bounds of the mesh so that it can be used in the BVH
  getExtents() {

    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];

    // Find the minimum and maximum bounds of the vertices
    for (let i = 0; i < this.obj.vertices.length; i += 3) {
      let vertex = vec3.fromValues(this.obj.vertices[i], this.obj.vertices[i + 1], this.obj.vertices[i + 2]);

      for (let j = 0; j < 3; j++) {
        min[j] = Math.min(min[j], vertex[j]);
        max[j] = Math.max(max[j], vertex[j]);
      }
    }

    return { min: min, max: max };
  }

  // Return the intersection point of a ray with the meshes triangles, along with the normal of the intersection
  intersects(ray) {

    let closestIntersection = null;
    let closestDist = Number.MAX_VALUE;

    let rayOrigin = ray.origin;

    // Loop through each triangle in the mesh and find the closest intersection point
    for (let i = 0; i < this.obj.vertices.length; i += 9) {

      let v0 = this.obj.vertices.slice(i, i + 3);
      let v1 = this.obj.vertices.slice(i + 3, i + 6);
      let v2 = this.obj.vertices.slice(i + 6, i + 9);

      let intersection = this.MollerTrumbore(ray, v0, v1, v2);
      // Return the closest intersection point found along with the normal of the intersection
      if (intersection != null) {
        let dist = vec3.distance(rayOrigin, intersection);

        // Calculate the normal of the triangle
        let normal = vec3.cross([], vec3.subtract([], v1, v0), vec3.subtract([], v2, v0));
        vec3.normalize(normal, normal);
        if (dist < closestDist) {
          closestDist = dist;
          closestIntersection = { point: intersection, normal: normal, dist: dist, object: this };
        }
      }
    }

    return closestIntersection;
  }


  // Find if a ray intersects a triangle
  MollerTrumbore(ray, v0, v1, v2) {
    let epsilon = 0.000001;

    let rayOrigin = ray.origin;
    let rayDirection = ray.direction;

    // Find edges of the triangle
    let edge1 = vec3.subtract([], v1, v0);
    let edge2 = vec3.subtract([], v2, v0);

    // Calculate determinant
    let h = vec3.cross([], rayDirection, edge2);
    let a = vec3.dot(edge1, h);

    // If determinant is near zero, ray lies in plane of triangle
    if (a > -epsilon && a < epsilon) {
      return null;
    }

    let f = 1 / a;
    let s = vec3.subtract([], rayOrigin, v0);
    let u = f * vec3.dot(s, h);

    if (u < 0 || u > 1) {
      return null;
    }

    let q = vec3.cross([], s, edge1);
    let v = f * vec3.dot(rayDirection, q);

    if (v < 0 || u + v > 1) {
      return null;
    }

    let t = f * vec3.dot(edge2, q);

    // If t is negative, the intersection point is behind the ray origin
    if (t < 0) return null;

    if (t > epsilon) {
      let intersectionPoint = vec3.scaleAndAdd([], rayOrigin, rayDirection, t);

      return intersectionPoint;
    } else {
      return null;
    }
  }
}

/* ---------------------- Point Light -----------------------------*/

class PointLight extends SceneObject {
  constructor() {
    super(); // position
    this.la = vec3.create(); // ambient colour
    this.lp = vec3.create(); // point light colour
    this.type = LIGHT;
  }
}


// Find closest object to the intersection point
function sortObjectsByDistanceFromPoint(objects, intersectionPoint) {
  // Calculate distances and store them along with objects
  let distancesAndObjects = objects.map(object => {
    let distance = vec3.distance(object.position, intersectionPoint); // Assuming object.center is the center of the object
    return { distance, object };
  });

  // Sort the array based on distances
  distancesAndObjects.sort((a, b) => a.distance - b.distance);

  // Retrieve sorted objects
  let sortedObjects = distancesAndObjects.map(item => item.object);

  return sortedObjects;
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

      // We check if t0 and t1 are negative because negative values result in shadows that are not supposed to exist in the scene
      if (t0 < 0 && t1 < 0) return null;

      let ri0 = vec3.scaleAndAdd([], rayOrigin, rayDirection, t0);
      let ri1 = vec3.scaleAndAdd([], rayOrigin, rayDirection, t1);

      let dist0 = vec3.distance(rayOrigin, ri0);
      let dist1 = vec3.distance(rayOrigin, ri1);

      // Get minimum between the two distances
      let closest = (dist0 < dist1) ? ri0 : ri1;

      // Return the closest intersection point to the ray origin
      if (closest === ri0) {
        return ri0;
      }
      else return ri1;
    }

    // We check if t0 is negative because negative values result in shadows that are not supposed to exist in the scene
    if (t0 < 0) return null;

    // ro + (rd * t0)
    return vec3.scaleAndAdd([], rayOrigin, rayDirection, t0);
  }
}
