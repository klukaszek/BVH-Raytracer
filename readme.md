# CIS 4800 Assignment 3/4 - Raytracer With Shadows and Reflections

## Author: Kyle Lukaszek
### ID: 1113798
### Description:

This JavaScript program takes a scene description file as an input and raytraces the scene to the 2D canvas. If a mesh is part of the scene description, it is important to load the .obj file along with the scene description so that the vertices are linked to the mesh object. If no obj is provided, the mesh is discarded from the list of scene objects and ignored.

The raytracing is done using BVHs to speed up the rendering time since rendering the fish would take forever with the large amount of vertices ithas. I could take it a step further and subdivide each BVH even further but I am happy with the performance for now.

I have tested mesh transformations and rotations and they seem to be working fine. My rotations are done in radians.

For specular highlights, I chose a specular value of 32.0. I accidentally had this set to the shiny value for my A3 spheres which is why all my sphere shading was wrong (meshes were fine).

Depth testing is also implemented so objects should render in the correct order.

Shadows and reflections are properly rendered with a recursion depth of 1.

The camera can be adjusted at the very top of the scene.js file. By default, the camera is at (0, 0, 0) and renders based on NDC. If you enable the perspective flag at the top of scene.js, the scene will render with a perspective camera that has an adjustable FOV.

If there are any noticeable jagged edges on meshes, this is caused by the rotation floating point values being weird in JavaScript. Normally enabling perspective camera fixes this, or increasing the canvas resolution.

I have encountered a bug that I have not yet been able to reproduce where the program crashes after finishing rendering because it tried to draw a pixel outside of the canvas. This has never happened again but if it does happen while testing it, just refresh the page and it should be fine.

The developer console contains all information used in the rendering process so that it can be easily inspected. This includes OBJ files, BVH Tree, and the Scene hierarchy.

### How to run:

To run the program, simply start a python http server within the project directory using:

`
python3 -m http.server
`

This should open port 8000.

To raytrace a scene, go to localhost:8000 in your browswer and load a scene file.

### Sample Scenes:

Check the testing files in testingFiles/

Loading test2.txt with cube.obj should produce the multi-reflection example
