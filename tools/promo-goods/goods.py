# THE SIX PROMO GOODS, MODELLED IN BLENDER (his 2026-10-26 "design 3D default for all the goods ... u can use any 3D
# design app"). One .glb per goods type; the app shows it when no photo was uploaded. Run:
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/promo-goods/goods.py   (writes public/promo/)
# Colours are the app's (cream #efe9df, black #1c1814, gold #d4a017). Every printed area is its own mesh named print_*
# with UVs and extras {print, aspect, style}: the viewer draws the item's name onto it at run time, so nothing here
# needs a font. Front = Blender -Y (glTF +Z, toward the viewer).
import bpy, bmesh, math, sys, os
from mathutils import Matrix, Vector

OUT = os.path.abspath(sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'promo'))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)   # first: it wipes every material made before it
TAU, RX90 = math.tau, Matrix.Rotation(math.pi / 2, 4, 'X')

def lin(h):
    c = [int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    return tuple(((x + 0.055) / 1.055) ** 2.4 if x > 0.04045 else x / 12.92 for x in c) + (1.0,)

def mat(name, hexc, rough=0.5, metal=0.0):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    try: m.use_nodes = True
    except Exception: pass
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = lin(hexc)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    m.use_backface_culling = True
    return m

CREAM, BLACK, FABRIC = mat('cream', '#efe9df', 0.25), mat('black', '#1c1814', 0.35), mat('fabric', '#1c1814', 0.9)
GOLD, SILVER, STEEL = mat('gold', '#d4a017', 0.3, 1.0), mat('silver', '#cfc8bb', 0.22, 1.0), mat('steel', '#4a4540', 0.4, 1.0)
PAPER = mat('paper', '#e6dfd2', 0.9)

def obj(name, bm, material, sharp=40):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.shade_smooth()
    if sharp: me.set_sharp_from_angle(angle=math.radians(sharp))
    me.materials.append(material)
    ob = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(ob)
    return ob

def lathe(name, pts, material, steps=72, sharp=40):
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in pts]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=TAU, steps=steps, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, material, sharp)

def rbox(name, size, center, bevel, material, segs=6):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    bmesh.ops.bevel(bm, geom=list(bm.verts) + list(bm.edges), offset=bevel, offset_type='OFFSET', segments=segs,
                    profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return obj(name, bm, material, 35)

def cyl(name, r, depth, matrix, material, segs=32):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    bmesh.ops.transform(bm, matrix=matrix, verts=bm.verts)
    return obj(name, bm, material, 40)

def sphere(name, r, scale, center, material):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=r)
    bmesh.ops.scale(bm, vec=scale, verts=bm.verts)
    bmesh.ops.translate(bm, vec=center, verts=bm.verts)
    return obj(name, bm, material, 0)

def sheet(name, nx, ny, at, material, extras=None, reverse=False):
    """A UV-mapped grid; at(u, v) -> (x, y, z). Faces wind so the normal points toward -Y for a front print."""
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UVMap')
    V = [[bm.verts.new(at(i / nx, j / ny)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            q = ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))
            if reverse: q = q[::-1]
            f = bm.faces.new([V[b][a] for a, b in q])
            for l, (a, b) in zip(f.loops, q): l[uv].uv = (a / nx, b / ny)
    ob = obj(name, bm, material, 0)
    for k, v in (extras or {}).items(): ob[k] = v
    return ob

def flat_print(name, w, h, center, aspect=None, style='label', back=False):
    rot = Matrix.Rotation(math.pi, 3, 'Z') if back else Matrix.Identity(3)
    def at(u, v):
        p = rot @ Vector(((u - 0.5) * w, 0, (v - 0.5) * h))
        return tuple(p + Vector(center))
    return sheet(name, 2, 2, at, mat('print', '#1c1814', 0.5),
                 {'print': 'back' if back else 'front', 'aspect': aspect or w / h, 'style': style})

def torus_arc(name, R, r, u0, u1, place, material, nu=40, nv=16):
    """A tube along a circle of radius R in the XZ plane from angle u0 to u1; place(Vector) -> Vector."""
    bm = bmesh.new()
    rows = []
    for i in range(nu + 1):
        u = u0 + (u1 - u0) * i / nu
        c, s = math.cos(u), math.sin(u)
        rows.append([bm.verts.new(place(Vector(((R + r * math.cos(v)) * c, r * math.sin(v), (R + r * math.cos(v)) * s))))
                     for v in (TAU * k / nv for k in range(nv))])
    for i in range(nu):
        for k in range(nv):
            bm.faces.new((rows[i][k], rows[i][(k + 1) % nv], rows[i + 1][(k + 1) % nv], rows[i + 1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, material, 0)

def tube(name, path, r, material, nv=10):
    """A round tube through a list of points (open ends hidden inside whatever they touch)."""
    bm, P = bmesh.new(), [Vector(p) for p in path]
    rings = []
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        a = t.cross(Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        rings.append([bm.verts.new(p + r * (math.cos(TAU * k / nv) * a + math.sin(TAU * k / nv) * b)) for k in range(nv)])
    for i in range(len(P) - 1):
        for k in range(nv):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % nv], rings[i + 1][(k + 1) % nv], rings[i + 1][k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, material, 0)

# ---------------------------------------------------------------- the goods

def mug():
    body = lathe('mug', [(0, 0), (0.38, 0), (0.41, 0.01), (0.42, 0.04), (0.42, 0.96), (0.415, 0.99), (0.40, 1.0),
                         (0.385, 0.99), (0.38, 0.96), (0.38, 0.13), (0.37, 0.11), (0, 0.11)], CREAM)
    cx, cz = 0.52, 0.52
    handle = torus_arc('mug_handle', 0.22, 0.05, -math.radians(118), math.radians(118),
                       lambda p: Vector((cx + p.x, p.y, cz + 1.25 * p.z)), CREAM)
    a0, a1, R = math.radians(-150), math.radians(-30), 0.4235
    band = sheet('print_front', 24, 1,
                 lambda u, v: (R * math.cos(a0 + (a1 - a0) * u), R * math.sin(a0 + (a1 - a0) * u), 0.30 + 0.42 * v),
                 mat('print', '#1c1814', 0.5), {'print': 'front', 'aspect': R * (a1 - a0) / 0.42, 'style': 'label'})
    return [body, handle, band]

def ashtray():
    body = lathe('ashtray', [(0, 0), (0.50, 0), (0.53, 0.01), (0.55, 0.04), (0.58, 0.24), (0.575, 0.275), (0.56, 0.29),
                             (0.54, 0.30), (0.47, 0.30), (0.455, 0.29), (0.45, 0.27), (0.40, 0.13), (0.38, 0.11),
                             (0, 0.11)], BLACK)
    cutters = []
    for deg in (270, 30, 150):
        a = math.radians(deg)
        m = Matrix.Translation((0.51 * math.cos(a), 0.51 * math.sin(a), 0.315)) @ Matrix.Rotation(a, 4, 'Z') \
            @ Matrix.Rotation(math.pi / 2, 4, 'Y')
        c = cyl(f'cut{deg}', 0.055, 0.34, m, BLACK, 24); c.hide_render = True
        mod = body.modifiers.new(f'notch{deg}', 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = c
        mod.solver = 'EXACT'
        cutters.append(c)
    ring = torus_arc('ashtray_line', 0.574, 0.007, 0, TAU, lambda p: Vector((p.x, p.z, 0.20 + p.y)), GOLD, 96, 8)
    floor = sheet('print_front', 16, 16, lambda u, v: ((u - 0.5) * 0.52, (v - 0.5) * 0.52, 0.112), mat('print', '#1c1814', 0.5),
                  {'print': 'front', 'aspect': 1.0, 'style': 'round'}, reverse=False)
    return [body, ring, floor], cutters

def squircle(a, b, n, t):
    """A point on a superellipse (a rounded rectangle for n > 2) at angle t."""
    c, s = math.cos(t), math.sin(t)
    return a * math.copysign(abs(c) ** (2 / n), c), b * math.copysign(abs(s) ** (2 / n), s)

def sprism(name, a, b, n, rings, material, cx=0.0, segs=64, sharp=40):
    """A solid with a superellipse cross-section; rings = [(z, scale)] bottom to top, both ends capped."""
    bm = bmesh.new()
    R = [[bm.verts.new((cx + s * x, s * y, z)) for x, y in (squircle(a, b, n, TAU * k / segs) for k in range(segs))]
         for z, s in rings]
    for i in range(len(R) - 1):
        for k in range(segs):
            bm.faces.new((R[i][k], R[i][(k + 1) % segs], R[i + 1][(k + 1) % segs], R[i + 1][k]))
    bm.faces.new(R[0][::-1]); bm.faces.new(R[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(name, bm, material, sharp)

def side_profile(name, pts, depth, material, bevel=0.008):
    """A flat outline in the XZ plane (x, z points), given thickness along Y, edges softened."""
    bm = bmesh.new()
    f = bm.faces.new([bm.verts.new((x, -depth / 2, z)) for x, z in pts])
    ext = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=[v for v in ext['geom'] if isinstance(v, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, offset_type='OFFSET', segments=3, profile=0.5,
                    affect='EDGES', clamp_overlap=True)
    return obj(name, bm, material, 35)

def lighter():
    """The korek gas a shop gets (his 2026-10-26 "remake the lighter because it doesnt look like a 3D lighter" and the
    photo he sent, "just make it like this one"): a flat see-through body with its insides showing (the centre tube and
    the inner frame), a black collar, the stamped metal top with a round hole and a slot, and the black press-lever
    sticking out on the right. The body takes COLOR; being see-through, any colour he picks reads like the photo."""
    A, B, N, TOP = 0.18, 0.075, 6.0, 0.80
    clear = bpy.data.materials.get('clear') or mat('clear', '#1c1814', 0.12)
    bsdf = clear.node_tree.nodes.get('Principled BSDF'); bsdf.inputs['Alpha'].default_value = 0.62
    clear.use_backface_culling = False   # see-through: the far wall shows too
    try: clear.surface_render_method = 'BLENDED'
    except Exception: clear.blend_method = 'BLEND'
    body = sprism('lighter', A, B, N, [(0, 0.9), (0.008, 0.96), (0.025, 0.99), (0.05, 1.0), (TOP, 1.0)], clear)
    # inside the plastic: the gas tube up the middle, and the inner frame (two walls and the shelf under the valve)
    tube = cyl('lighter_tube', 0.011, TOP - 0.16, Matrix.Translation((-0.03, 0, 0.08 + (TOP - 0.16) / 2)), clear, 16)
    frame = side_profile('lighter_frame', [(-0.125, 0.05), (-0.105, 0.05), (-0.105, 0.60), (0.105, 0.60), (0.105, 0.05),
                                           (0.125, 0.05), (0.125, 0.625), (-0.125, 0.625)], 0.11, clear, 0.004)
    dark = mat('collar', '#16130f', 0.45)
    collar = sprism('lighter_collar', A, B, N, [(TOP - 0.004, 1.012), (TOP + 0.05, 1.012)], dark)
    top = rbox('lighter_top', (0.24, 0.125, 0.16), (-0.045, 0, TOP + 0.05 + 0.08), 0.014, SILVER, 3)
    cutters = []
    for i, m in enumerate((Matrix.Translation((0.02, 0, TOP + 0.175)) @ RX90,)):   # the round hole near the top
        c = cyl(f'cut{i}', 0.024, 0.3, m, SILVER, 24); c.hide_render = True; cutters.append(c)
    slot = rbox('cut_slot', (0.04, 0.3, 0.03), (0.035, 0, TOP + 0.085), 0.002, SILVER, 1); slot.hide_render = True
    cutters.append(slot)
    for c in cutters:
        mod = top.modifiers.new(c.name, 'BOOLEAN'); mod.operation = 'DIFFERENCE'; mod.object = c; mod.solver = 'EXACT'
    lever = side_profile('lighter_lever', [(0.06, TOP + 0.05), (0.19, TOP + 0.05), (0.205, TOP + 0.065), (0.205, TOP + 0.11),
                                           (0.19, TOP + 0.125), (0.16, TOP + 0.12), (0.11, TOP + 0.10), (0.06, TOP + 0.10)],
                         0.085, BLACK, 0.006)
    # the word alone on the flat front of the body; the back carries the second word
    def face(u, v, back):
        x = (u - 0.5) * 0.25
        y = -(B * (1 - abs(x / A) ** N) ** (1 / N) + 0.0015)
        return (-x, -y, 0.10 + 0.56 * v) if back else (x, y, 0.10 + 0.56 * v)
    ink = mat('print', '#1c1814', 0.5)
    front = sheet('print_front', 8, 1, lambda u, v: face(u, v, False), ink, {'print': 'front', 'aspect': 0.25 / 0.56, 'style': 'ink'})
    back = sheet('print_back', 8, 1, lambda u, v: face(u, v, True), ink, {'print': 'back', 'aspect': 0.25 / 0.56, 'style': 'ink'})
    return [body, tube, frame, collar, top, lever, front, back], cutters

def hat():
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=0.5)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS')
    HZ = 0.92
    bmesh.ops.scale(bm, vec=(1, 1, HZ), verts=bm.verts)
    crown = obj('hat', bm, FABRIC, 0)
    s = crown.modifiers.new('wall', 'SOLIDIFY'); s.thickness = 0.02; s.offset = -1
    button = sphere('hat_button', 0.045, (1, 1, 0.5), (0, 0, 0.5 * HZ), GOLD)
    # six panel seams, base to button - what makes a dome read as a cap
    seams = [tube(f'hat_seam{n}', [(0.503 * math.cos(u) * math.cos(a), 0.503 * math.cos(u) * math.sin(a), 0.503 * HZ * math.sin(u))
                                   for u in (math.pi / 2 * i / 24 for i in range(25))], 0.006, BLACK, 6)
             for n, a in enumerate(math.radians(60 * k) for k in range(6))]   # none down the front: that panel carries the print
    Rin, B, M, N = 0.47, 0.86, 6, 48
    def brim_at(u, v):
        t = math.pi + math.pi * u
        x, yi, yo = Rin * math.cos(t), Rin * math.sin(t), B * math.sin(t)
        y = yi + (yo - yi) * v
        return (x, y, 0.012 - 0.10 * v * max(0.0, -math.sin(t)) ** 1.5)
    bm = bmesh.new()
    V = [[bm.verts.new(brim_at(i / N, k / M)) for i in range(N + 1)] for k in range(M + 1)]
    for k in range(M):
        for i in range(N):
            bm.faces.new((V[k][i], V[k + 1][i], V[k + 1][i + 1], V[k][i + 1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    brim = obj('hat_brim', bm, FABRIC, 0)
    s = brim.modifiers.new('thick', 'SOLIDIFY'); s.thickness = 0.025; s.offset = -1
    edge = tube('hat_brim_edge', [Vector(brim_at(i / N, 1.0)) + Vector((0, 0, -0.012)) for i in range(4, N - 3)], 0.014, GOLD, 8)
    panel = sheet('print_front', 20, 8, lambda u, v: ((u - 0.5) * 0.46, -0.66, 0.10 + 0.21 * v),
                  mat('print', '#1c1814', 0.5), {'print': 'front', 'aspect': 0.46 / 0.21, 'style': 'ink'})
    w = panel.modifiers.new('onto', 'SHRINKWRAP'); w.target = crown; w.wrap_method = 'NEAREST_SURFACEPOINT'; w.offset = 0.008
    return [crown, button, brim, edge, panel] + seams

# the lab's T-shirt (tools/ponder-lab.jsx labShirtPic, viewBox 90x100), x -> X, y -> Z, 78 units = 1.0
SHIRT = [(31, 13), (18, 17), (6, 31), (16, 41), (24, 35), (24, 91), (66, 91), (66, 35), (74, 41), (84, 31), (72, 17),
         (59, 13), (52, 17.5), (45, 19), (38, 17.5)]

def tshirt():
    cu = bpy.data.curves.new('tshirt', 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude, cu.bevel_depth, cu.bevel_resolution = 0.05, 0.025, 4
    sp = cu.splines.new('POLY'); sp.points.add(len(SHIRT) - 1); sp.use_cyclic_u = True; sp.use_smooth = True
    for i, (x, y) in enumerate(SHIRT): sp.points[i].co = ((x - 45) / 78, (91 - y) / 78, 0, 1)
    tmp = bpy.data.objects.new('tmp', cu); bpy.context.collection.objects.link(tmp)
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(tmp)
    me.transform(RX90); me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(40))
    me.materials.clear(); me.materials.append(FABRIC)
    body = bpy.data.objects.new('tshirt', me); bpy.context.collection.objects.link(body)
    front = flat_print('print_front', 0.40, 0.26, (0, -0.078, 0.56), style='ink')
    back = flat_print('print_back', 0.40, 0.26, (0, 0.078, 0.56), style='ink', back=True)
    neck = [((x - 45) / 78, (91 - y) / 78) for x, y in ((31, 13), (38, 17.5), (45, 19), (52, 17.5), (59, 13))]
    collars = [tube(f'tshirt_collar{n}', [(x, y0, z - 0.012) for x, z in neck], 0.02, BLACK, 8) for n, y0 in ((0, -0.06), (1, 0.06))]
    return [body, front, back] + collars

def poster():
    """A poster on a hanger (his 2026-10-26 "redesign the poster to show that it is a poster" - the first one was a bare
    curved sheet, which read as a card): the paper held by a bar at the top and the bottom, knobs on the bar ends, a cord
    to hang it by. The paper is flat at the bars and bellies a little between them, like real poster paper."""
    W, H, bow = 0.70, 0.99, 0.03
    belly = lambda u, v: -bow * math.sin(math.pi * u) * math.sin(math.pi * v)
    front = sheet('print_front', 16, 12, lambda u, v: ((u - 0.5) * W, belly(u, v), v * H),
                  mat('print_poster', '#efe9df', 0.8), {'print': 'front', 'aspect': W / H, 'style': 'poster'})
    back = sheet('poster_back', 16, 12, lambda u, v: ((u - 0.5) * W, belly(u, v) + 0.004, v * H), PAPER, reverse=True)
    rail = mat('rail', '#2a211a', 0.55)
    RY = Matrix.Rotation(math.pi / 2, 4, 'Y')
    rails = [cyl(f'poster_rail_{side}', 0.022, W + 0.05, Matrix.Translation((0, 0.002, z)) @ RY, rail, 24)
             for side, z in (('top', H + 0.006), ('bottom', -0.006))]
    knobs = [sphere(f'poster_knob{i}', 0.03, (1, 1, 1), (x, 0.002, z), rail)
             for i, (x, z) in enumerate(((-(W / 2 + 0.035), H + 0.006), (W / 2 + 0.035, H + 0.006),
                                         (-(W / 2 + 0.035), -0.006), (W / 2 + 0.035, -0.006)))]
    cord = tube('poster_cord', [(-(W / 2 - 0.03), 0.002, H + 0.02), (-0.12, 0.002, H + 0.14), (0, 0.002, H + 0.19),
                                (0.12, 0.002, H + 0.14), (W / 2 - 0.03, 0.002, H + 0.02)], 0.006, mat('cord', '#1c1814', 0.7))
    return [front, back, *rails, *knobs, cord]

# ---------------------------------------------------------------- export

TILT = {'ashtray': 1.0, 'hat': 0.55}   # looked at from above, or the print hides

def thumb(name, keep, path):
    """The Master Vault list picture (48 px on screen): the same model, three-quarter view, transparent."""
    sc = bpy.context.scene
    for o in keep:   # an 'ink' print is the word alone, drawn only in the app - here it would be a blank dark patch
        if o.get('style') == 'ink': o.hide_render = True
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = 192
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    if not sc.world:
        sc.world = bpy.data.worlds.new('room')
        try: sc.world.use_nodes = True
        except Exception: pass
        bg = sc.world.node_tree.nodes.get('Background')
        bg.inputs['Color'].default_value = (0.55, 0.52, 0.48, 1); bg.inputs['Strength'].default_value = 0.9
    dg = bpy.context.evaluated_depsgraph_get()
    pts = [o.matrix_world @ Vector(c) for o in keep for c in o.evaluated_get(dg).bound_box]
    lo = Vector([min(p[i] for p in pts) for i in range(3)]); hi = Vector([max(p[i] for p in pts) for i in range(3)])
    mid, span = (lo + hi) / 2, max(hi - lo)
    cd = bpy.data.cameras.new('cam'); cd.type = 'ORTHO'; cd.ortho_scale = span * 1.3
    cam = bpy.data.objects.new('cam', cd); bpy.context.collection.objects.link(cam)
    look = Vector((0.45, -1.0, TILT.get(name, 0.3))).normalized()
    cam.location = mid + look * 6; cam.rotation_euler = (-look).to_track_quat('-Z', 'Y').to_euler()
    ld = bpy.data.lights.new('sun', 'SUN'); ld.energy = 3.5
    sun = bpy.data.objects.new('sun', ld); bpy.context.collection.objects.link(sun)
    sun.rotation_euler = Vector((0.6, -1.0, 1.4)).normalized().to_track_quat('Z', 'Y').to_euler()
    sc.camera = cam; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print('THUMB', name, os.path.getsize(path))

def clear():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    for c in list(bpy.data.curves): bpy.data.curves.remove(c)

ONLY = os.environ.get('GOODS')   # GOODS=lighter remakes one model and leaves the other files untouched
for name, build in (('mug', mug), ('ashtray', ashtray), ('lighter', lighter), ('hat', hat), ('tshirt', tshirt), ('poster', poster)):
    if ONLY and name != ONLY: continue
    clear()
    made = build()
    keep, helpers = (made if isinstance(made, tuple) else (made, []))
    bpy.context.view_layer.update()
    for o in bpy.data.objects: o.select_set(o in keep)
    bpy.context.view_layer.objects.active = keep[0]
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_extras=True, export_yup=True)
    print('WROTE', name, os.path.getsize(path))
    thumb(name, keep, os.path.join(OUT, name + '.png'))
