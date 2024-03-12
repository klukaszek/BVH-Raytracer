// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3
//
// Description: This file contains the classes for meshes, spheres, and lights 
// This includes the raytracing functions for each object and the shading calculations

class Sphere {
  constructor() {
    this.position = vec3.create();
    this.radius = 0.0;
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
  }

  getExtents() {
    let min = vec3.subtract([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
    let max = vec3.add([], this.position, vec3.fromValues(this.radius, this.radius, this.radius));
    return { min: min, max: max };
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

/* ---------------------- Mesh -----------------------------*/

class Mesh {
  constructor() {
    this.obj = new Obj();
    this.position = vec3.create();
    this.rotation = vec3.create();
    this.scale = 1.0;
    this.transform = mat4.create();
    this.ambient = vec3.create();
    this.diffuse = vec3.create();
    this.specular = vec3.create();
    this.shiny = 0.0;
  }

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

  // I was having trouble with raytracing the mesh in the shaders, so I decided to raytrace the mesh in js
  raytrace(scene, rayOrigin, rayDirection) {

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

      let intersection = this.MollerTrumbore(rayOrigin, rayDirection, v0, v1, v2);
      // Return the closest intersection point found along with the normal of the intersection
      if (intersection != null) {
        let dist = vec3.distance(rayOrigin, intersection);

        // Calculate the normal of the triangle
        let normal = vec3.cross([], vec3.subtract([], v1, v0), vec3.subtract([], v2, v0));
        vec3.normalize(normal, normal);
        if (dist < closestDist) {
          closestDist = dist;
          closestIntersection = { point: intersection, normal: normal };
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
}
