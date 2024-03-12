// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3

// Mostly reused camera class from A1 and A2

// This is for the assignment but I'm also using it for a personal project so it's a bit more than what's required
// The camera idea is a gl-matrix implementation of the camera from https://learnwebgl.brown37.net/07_cameras/
// The camera is a perspective camera with a fov, aspect ratio, near and far clip plane

/**
 * Camera class
 */
class Camera {
  /**
   * @param {vec3} position 
   * @param {vec3} rotation camera rotation in radians ()
   * @param {vec3} up upward vector for the camera
   * @param {float} fov field of view in radians
   * @param {float} aspect aspect ratio (default = width / height)
   * @param {float} near determines the minimum distance of objects to be rendered
   * @param {float} far determines the maximum distance of objects to be rendered
   */
  constructor(position, rotation, fov, aspect, near, far) {
    // Camera definition at the default camera location and orientation.
    this.eye = position;  // (x,y,z), origin
    this.u = vec3.fromValues(rotation[0], 0, 0);  // <dx,dy,dz>, X axis
    this.v = vec3.fromValues(0, rotation[1], 0);  // <dx,dy,dz>, Y axis
    this.n = vec3.fromValues(0, 0, rotation[2]);  // <dx,dy,dz>, Z axis

    // Perspective projection parameters
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;

    this.projection = this.getProjectionMatrix();

    // Create a matrix to hold the camera's matrix transform
    this.transform = mat4.create();

    // Store the rotation matrix
    this.rotation = mat4.create();

    // Store the angles
    this.angles = vec3.create();

    // Keep track of the scaled vectors
    this.u_scaled = vec3.create();  // a scaled u coordinate axis of camera
    this.v_scaled = vec3.create();  // a scaled v coordinate axis of camera
    this.n_scaled = vec3.create();  // a scaled n coordinate axis of camera
  }

  getProjectionMatrix() {
    return mat4.perspective([], this.fov, this.aspect, this.near, this.far);
  }

  getRayDirection(x, y, width, height) {

    let ndcX = (2.0 * x / width) - 1.0;
    let ndcY = 1.0 - (2.0 * y / height);

    let tanHalfFov = Math.tan(this.fov / 2.0);
    let offsetX = tanHalfFov * this.aspect * ndcX;
    let offsetY = tanHalfFov * ndcY;

    let rayDirection = vec3.fromValues(offsetX, offsetY, -1.0);

    vec3.normalize(rayDirection, rayDirection);

    return rayDirection;

  }

  /**
   * @returns {vec3} camera eye position
   */
  getPosition = () => this.eye;

  /**
   * @returns {vec3} camera rotation in radians
   */
  getRotation = () => this.angles;

  /**
   * Adjust the camera fov depending on if a value is changed
   * @param {float} fov 
   * @returns 
   */
  setFov = (fov) => this.fov = fov * Math.PI / 180;

  /**
   * @returns {float} camera fov in radians
   */
  getFov = () => this.fov;

  /**
   * Adjust the camera aspect depending on if a value is changed
   * @param {float} aspect 
   * @returns 
   */
  setAspect = (aspect) => this.aspect = aspect;

  /**
   * @returns {float} camera aspect ratio
   */
  getAspect = () => this.aspect;

  /**
   * Adjust the camera near depending on if a value is changed
   * @param {float} near near clip plane
   * @returns 
   */
  setNear = (near) => this.near = near;

  /**
   * @returns {float} camera near clip plane
   */
  getNear = () => this.near;

  /**
   * Adjust the camera far depending on if a value is changed
   * @param {float} far far clip plane 
   * @returns 
   */
  setFar = (far) => this.far = far;

  /**
   * @returns {float} camera far clip plane
   */
  getFar = () => this.far;

  //-----------------------------------------------------------------------
  /**
   * Using the current values for eye, u, v, and n, set a new camera
   * transformation mat4.
   */
  update() {
    var tx = -vec3.dot(this.u, this.eye);
    var ty = -vec3.dot(this.v, this.eye);
    var tz = -vec3.dot(this.n, this.eye);

    // Use an alias for this.transform to simplify the assignment statements
    var M = this.transform;

    mat4.identity(M);

    // Set the camera matrix
    M[0] = this.u[0]; M[4] = this.u[1]; M[8] = this.u[2]; M[12] = tx;
    M[1] = this.v[0]; M[5] = this.v[1]; M[9] = this.v[2]; M[13] = ty;
    M[2] = this.n[0]; M[6] = this.n[1]; M[10] = this.n[2]; M[14] = tz;
    M[3] = 0; M[7] = 0; M[11] = 0; M[15] = 1;
  };

  //-----------------------------------------------------------------------

  // Camera position translation functions

  /**
   * Perform a "truck" operation on the camera
   * Move camera along the X axis
   * @param {float} distance
   */
  truck(distance) {
    //mat4.identity(this.transform);
    mat4.identity(this.rotation);

    // Scale the u axis to the desired distance to move
    vec3.scale(this.u_scaled, this.u, distance);

    // Add the direction vector to the eye position.
    vec3.add(this.eye, this.eye, this.u_scaled);

    // Set the camera transformation. Since the only change is in location,
    // change only the values in the 4th column.
    this.transform[12] = -vec3.dot(this.u, this.eye);
    this.transform[13] = -vec3.dot(this.v, this.eye);
    this.transform[14] = -vec3.dot(this.n, this.eye);
  };

  /**
   * Perform a "pedestal" operation on the camera
   * Move camera along the Y axis
   * @param {float} distance 
   */
  pedestal(distance) {
    //mat4.identity(this.transform);
    mat4.identity(this.rotation);

    // Scale the v axis to the desired distance to move
    vec3.scale(this.v_scaled, this.v, distance);

    // Add the direction vector to the eye position.
    vec3.add(this.eye, this.eye, this.v_scaled);

    // Set the camera transformation. Since the only change is in location,
    // change only the values in the 4th column.
    this.transform[12] = -vec3.dot(this.u, this.eye);
    this.transform[13] = -vec3.dot(this.v, this.eye);
    this.transform[14] = -vec3.dot(this.n, this.eye);
  }

  /**
   * Perform a "dolly" operation on the camera
   * Move camera along the Z axis
   * @param {float} distance 
   */
  dolly(distance) {
    //mat4.identity(this.transform);
    mat4.identity(this.rotation);

    // Scale the n axis to the desired distance to move
    vec3.scale(this.n_scaled, this.n, distance);

    // Add the direction vector to the eye position.
    vec3.add(this.eye, this.eye, this.n_scaled);

    // Set the camera transformation. Since the only change is in location,
    // change only the values in the 4th column.
    this.transform[12] = -vec3.dot(this.u, this.eye);
    this.transform[13] = -vec3.dot(this.v, this.eye);
    this.transform[14] = -vec3.dot(this.n, this.eye);
  }

  //-----------------------------------------------------------------------

  // Camera rotation functions

  /**
   * Perform a "tilt" operation on the camera
   * Rotate the camera around the X axis (u)
   * @param {float} angle angle in radians
   */
  tilt(angle) {

    mat4.identity(this.transform);
    mat4.identity(this.rotation);

    const rotation_axis = [this.u[0], this.u[1], this.u[2]];
    // Rotate the camera's coordinate system about u
    mat4.rotate(this.rotation, this.rotation, angle, rotation_axis);

    // Use the rotate matrix to update v, and n 
    vec3.transformMat4(this.v, this.v, this.rotation);
    vec3.transformMat4(this.n, this.n, this.rotation);

    // Use an alias for this.transform to simplify the assignment statements
    var M = this.transform;

    // We update the y (n) and z (v) rows of the matrix, since we are rotating about the x (u) axis
    M[1] = this.v[0]; M[5] = this.v[1]; M[9] = this.v[2];
    M[2] = this.n[0]; M[6] = this.n[1]; M[10] = this.n[2];

    // Update the translation values of ty and tz
    M[13] = -vec3.dot(this.v, this.eye);
    M[14] = -vec3.dot(this.n, this.eye);
  };

  /**
   * Perform a "pan" operation on the camera
   * Rotate the camera around the Y axis (v)
   * @param {float} angle angle in radians
   */
  pan(angle) {

    mat4.identity(this.transform);
    mat4.identity(this.rotation);

    const rotation_axis = [this.v[0], this.v[1], this.v[2]];

    // Rotate the camera's coordinate system about v
    mat4.rotate(this.rotation, this.rotation, angle, rotation_axis);

    // Use the rotate matrix to update u, and n
    vec3.transformMat4(this.u, this.u, this.rotation);
    vec3.transformMat4(this.n, this.n, this.rotation);

    // Use an alias for this.transform to simplify the assignment statements
    var M = this.transform;

    // We update the x (n) and z (u) rows of the matrix, since we are rotating about the y (v) axis
    M[0] = this.u[0]; M[4] = this.u[1]; M[8] = this.u[2];
    M[2] = this.n[0]; M[6] = this.n[1]; M[10] = this.n[2];

    // Update the translation values of tx and tz
    M[12] = -vec3.dot(this.u, this.eye);
    M[14] = -vec3.dot(this.n, this.eye);
  }

  /**
   * Perform a "cant" operation on the camera
   * Rotate the camera around the Z axis (n)
   * @param {float} angle angle in radians
   */
  cant(angle) {

    mat4.identity(this.transform);
    mat4.identity(this.rotation);

    const rotation_axis = [this.n[0], this.n[1], this.n[2]];

    // Rotate the camera's coordinate system about n
    mat4.rotate(this.rotation, this.rotation, angle, rotation_axis);

    // Use the rotate matrix to update u, and v
    vec3.transformMat4(this.u, this.u, this.rotation);
    vec3.transformMat4(this.v, this.v, this.rotation);

    // Use an alias for this.transform to simplify the assignment statements
    var M = this.transform;

    // We update the x (v) and y (u) rows of the matrix, since we are rotating about the z (n) axis
    M[0] = this.u[0]; M[4] = this.u[1]; M[8] = this.u[2];
    M[1] = this.v[0]; M[5] = this.v[1]; M[9] = this.v[2];

    // Update the translation values of tx and ty
    M[12] = -vec3.dot(this.u, this.eye);
    M[13] = -vec3.dot(this.v, this.eye);
  }
}

// -----------------------------------------------------------------------

// Rotate the camera to look down on the xz plane
//camera.pan(Math.PI / 2);

// Manually set the angle
// I should have probably made a rotateX, rotateY, rotateZ function that calls 
// the appropriate function and then updates the angle vector
//camera.angles[1] = Math.PI / 2;
//
