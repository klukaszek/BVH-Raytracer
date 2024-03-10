// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3
//
// Description: This file contains the class for a BHV node 
// and the functions to build the BVH tree using the objects in the scene


// Create a bvh node for the bvh tree
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
      return this.object.raytrace(scene, rayOrigin, rayDirection);
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

// Build a BVH tree from a list of objects
function buildBVH(objects) {
  if (objects.length == 0) return null;

  // If only one sphere, return a new leaf node with the sphere as the object
  if (objects.length == 1) {
    let boundingBox = calculateBoundingBox(objects);
    return new BVHNode(boundingBox, null, null, objects[0]);
  }

  // Get the bounding box for the objects and then partition them
  let boundingBox = calculateBoundingBox(objects);
  let partitionedObjects = partitionObjects(objects, boundingBox);

  let left = buildBVH(partitionedObjects.left);
  let right = buildBVH(partitionedObjects.right);

  // Create new node from partitions
  return new BVHNode(boundingBox, left, right, null);
}

// Return bounding box for a list of objects to be rendered
function calculateBoundingBox(objects) {

  // We have use infinity because Number.MIN_VALUE -> 0 from the right side
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  // Find the minimum and maximum bounds of the objects
  for (let object of objects) {

    // Find bounds of a box that encapsulates the objects
    let extents = object.getExtents();
    
    if (extents == null) continue;

    let minExt = extents.min;
    let maxExt = extents.max;

    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], minExt[i]);
      max[i] = Math.max(max[i], maxExt[i]);
    }
  }

  return { min: min, max: max };
}

// Split the objects into two halves based on the longest axis of the bounding box
function partitionObjects(objects, boundingBox) {
  if (objects.length === 0) return { left: [], right: [] };

  let min = boundingBox.min;
  let max = boundingBox.max;

  // Determine the longest axis
  let extents = vec3.subtract([], max, min);
  let longestAxis = extents.indexOf(Math.max(...extents));

  // Sort the objects by the longest axis
  // Important because it determines how the objects are disributed in the BVH tree

  objects.sort((a, b) => a.position[longestAxis] - b.position[longestAxis]);

  // Split the sorted list of objects into two halves
  let middle = Math.floor(objects.length / 2);
  let left = objects.slice(0, middle);
  let right = objects.slice(middle);

  return { left: left, right: right };
}

