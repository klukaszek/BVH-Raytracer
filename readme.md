# CIS 4800 Assignment 3 - Simple Raytracer

## Author: Kyle Lukaszek

### Description:

This JavaScript program takes a scene description file as an input and raytraces the scene to the 2D canvas. If a mesh is part of the scene description, it is important to load the .obj file along with the scene description so that the vertices are linked to the mesh object. If no obj is provided, the mesh is discarded from the list of scene objects and ignored.

The raytracing is done using BVHs to speed up the rendering time since rendering the fish would take forever with the large amount of vertices ithas. I could take it a step further and subdivide each BVH even further but I am happy with the performance for now.

I have tested mesh transformations and rotations and they seem to be working fine.

Depth testing is also implemented so objects should render in the correct order.

I have encountered a bug that I have not yet been able to reproduce where the program crashes after finishing rendering because it tried to draw a pixel outside of the canvas. This has never happened again but if it does happen while testing it, just refresh the page and it should be fine.

The developer console contains all information used in the rendering process so that it can be easily inspected. This includes OBJ files, BVH Tree, and the Scene hierarchy.

### How to run:

To run the program, simply start a python http server within the project directory using:

`
python3 -m http.server
`

This should open port 8000.

To raytrace a scene, go to localhost:8000 in your browswer.

### Sample Scene:

`
light    -1.0 0.0 1.0     0.1 0.1 0.1    0.5 0.5 0.5

4

sphere   -7.0 1.0 -20.0    2.0     0.0 1.0 0.0     1.0 1.0 1.0   1.0 0.0 0.0    4.0

sphere   0.0 1.0 -8.0     0.5    0.0 1.0 0.0      1.0 1.0 1.0   0.0 1.0 0.0    4.0

sphere   6.0 1.0 -8.0     2.0     0.0 1.0 0.0      1.0 1.0 1.0   0.0 1.0 0.0    4.0

sphere   -1.0 1.0 -8.0    2.0     0.0 1.0 0.0      1.0 1.0 1.0   0.0 1.0 0.0    4.0

mesh      0.0 0.0 -5.0    0.0 -90.0 0.0    1.0    0.0 1.0 0.0   1.0 1.0 1.0   0.0 1.0 0.0  32.0
`
