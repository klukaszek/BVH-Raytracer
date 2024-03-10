// Author: Kyle Lukaszek
// CIS*4800 W24 - Computer Graphics
// Assignment 3
/* 
  -the functions which returns a properly formatted object for the .obj file
  -Originally written for Assignment 2, but modified for Assignment 3
*/

class Obj {
  constructor(filename, vertices, normals, indices, faces, vertexCount) {
    this.name = filename;
    this.vertices = vertices;
    this.normals = normals;
    this.indices = indices;
    this.faces = faces;
    this.vertexCount = vertexCount;
  }

  // return the number of vertices in the object
  getVertexCount() {
    return (this.vertexCount);
  }

  // vertex positions (x,y,z values)
  loadvertices() {
    return this.vertices;
  }

  // normals array
  loadnormals() {
    return new Float32Array(this.normals);
  }

  // load vertex indices
  loadvertexindices() {
    return this.indices;
  }

  getName() {
    return this.name;
  }
}
// create geometry which will be drawn by WebGL
// create vertex, normal, texture, and index information
function initObj(filename, objFile) {

  // Reset the geometry arrays to empty if they are not already
  // This is to ensure that the geometry arrays are empty if the user loads a new .obj file
  let vertices = [];
  let indices = [];
  let normals = [];
  let textureCoords = [];
  let vertexCount = 0;

  // Load the .obj file and create the vertex, normal, texture, and faces arrays
  let local_vertices = [];
  let local_textures = [];
  let local_normals = [];
  let faces = [];

  // Get the lines of the .obj file
  const lines = objFile.split('\n');

  // For each line in the .obj file, parse the line and create the vertex, normal, texture, and faces arrays
  lines.forEach(line => {
    const parts = line.trim().split(/\s+/);
    const prefix = parts.shift();

    // Load the vertex, normal, texture, and face data
    if (prefix === 'v') {
      local_vertices.push(parts.map(parseFloat));
    } else if (prefix === 'vt') {
      // Here we cannot use map since we need to flip the y value of the texture coordinates
      let vt1 = parseFloat(parts[0]);
      let vt2 = 1.0 - parseFloat(parts[1]);
      local_textures.push([vt1, vt2]);
    } else if (prefix === 'vn') {
      local_normals.push(parts.map(parseFloat));
    } else if (prefix === 'f') {
      const faceData = parts.map(vertex => {
        const indices = vertex.split('/');
        return indices.map(index => index ? parseInt(index) : 0);
      });

      // Ensure proper winding order (counter-clockwise)
      if (faceData.length >= 3 && local_normals.length > 0) {
        const v0 = local_vertices[faceData[0][0] - 1];
        const v1 = local_vertices[faceData[1][0] - 1];
        const v2 = local_vertices[faceData[2][0] - 1];
        const crossProduct = vec3.cross([], vec3.subtract([], v1, v0), vec3.subtract([], v2, v0));
        // If the cross product is pointing in the opposite direction of the normal, reverse the face data
        if (vec3.dot(crossProduct, local_normals[faceData[0][2] - 1]) < 0) {
          faceData.reverse();
        }
      }

      // Add the face data to the faces array
      faces.push(faceData);
    }
  });

  // If the obj file does not contain normals, calculate the normals based on the vertices
  if (local_normals.length === 0) {
    local_normals = calculateMeshNormalsFromFaces(local_vertices, faces);
  }

  // Generate the vertex, normal, texture, and indices arrays based on the face data from the .obj file
  faces.forEach(face => {
    face.forEach(vertex => {
      const [vertexIndex, textureIndex, normalIndex] = vertex;

      // Our indices should just be an array of numbers from 0 to the number of vertices
      indices.push(vertexCount++);

      // Add the corresponding face vertices to the vertices array
      // We subtract 1 from the vertex index since the .obj file indices are 1-based
      vertices.push(...local_vertices[vertexIndex - 1]);

      // If the obj file contains texture coordinates, use them
      if (textureIndex !== undefined && local_textures.length > 0)
        textureCoords.push(...local_textures[textureIndex - 1]);

      // If the obj  file contains normals, use them
      if (normalIndex !== undefined && local_normals.length > 0) {
        normals.push(...local_normals[normalIndex - 1]);
      }
      // Otherwise, we use the normals that were calculated relative to the vertices
      // This means that we can use the vertex index to get the normal
      else if (normalIndex === undefined && local_normals.length > 0) {
        normals.push(...local_normals[vertexIndex - 1]);
      }
    });
  });

  // Initialize obj object
  let obj = new Obj(filename, vertices, normals, indices, faces, vertexCount);
  console.log(obj);
  return obj;
}

/**
 * Calculate the normals for the vertices of a mesh based on the faces
 * @param {*} local_vertices 
 * @param {*} faces 
 * @returns face normals
 */
function calculateMeshNormalsFromFaces(local_vertices, faces) {
  // Create an array to store the normals for each vertex, and initialize them to [0, 0, 0]
  let local_normals = new Array(faces.length).fill([0, 0, 0]);

  // Determine the normals for each face and add them to the corresponding vertices
  faces.forEach(face => {
    const vertex1 = local_vertices[face[0][0] - 1];
    const vertex2 = local_vertices[face[1][0] - 1];
    const vertex3 = local_vertices[face[2][0] - 1];

    // Determine the normal for the face
    const normal = calculateNormal(vertex1, vertex2, vertex3);

    face.forEach(vertex => {
      const vertexIndex = vertex[0] - 1;
      local_normals[vertexIndex] = vec3.add([], local_normals[vertexIndex], normal);
    });
  });

  // Normalize the normals
  local_normals.forEach(normal => {
    normal = vec3.normalize(normal, normal);
  });

  return local_normals;
}

function calculateMeshNormalsFromVertices(vertices, indices) {

  // Create an array to store the normals for each vertex, and initialize them to [0, 0, 0]
  let local_normals = new Array(vertices.length).fill([0, 0, 0]);

  // Determine the normals for each face and add them to the corresponding vertices
  for (let i = 0; i < indices.length; i += 3) {
    const vertex1 = vertices[indices[i]];
    const vertex2 = vertices[indices[i + 1]];
    const vertex3 = vertices[indices[i + 2]];

    // Determine the normal for the face
    const normal = calculateNormal(vertex1, vertex2, vertex3);

    local_normals[indices[i]] = vec3.add([], local_normals[indices[i]], normal);
    local_normals[indices[i + 1]] = vec3.add([], local_normals[indices[i + 1]], normal);
    local_normals[indices[i + 2]] = vec3.add([], local_normals[indices[i + 2]], normal);
  }

  // Normalize the normals
  local_normals.forEach(normal => {
    normal = vec3.normalize(normal, normal);
  });

  return local_normals;

}

/**
 * Calculate the normal for a given triangle defined by three vertices
 * @param {*} vertex1 
 * @param {*} vertex2 
 * @param {*} vertex3 
 * @returns {vec3} The normal for the triangle defined by the three vertices
 */
function calculateNormal(vertex1, vertex2, vertex3) {
  const vector1 = vec3.subtract([], vertex2, vertex1);
  const vector2 = vec3.subtract([], vertex3, vertex1);
  const normal = vec3.cross([], vector1, vector2);
  return normal;
}
