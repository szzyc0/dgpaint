const CORRIDOR = 'corridor'
const STAIR = 'stair'
const ROOM = 'room'
const UNIT = 16
const DOOR_WIDTH = UNIT * 0.6
const DOOR_HEIGHT = UNIT * 0.25
const LOCK_R = UNIT * 0.2

const Rooms = []
const Doors = []

class Room {
  x = 0
  y = 0
  width = 0
  height = 0
  type = 0
  doors = []
  contents = []

  constructor () {
    Rooms.push(this)
  }

  addDoor (position) {
    const door = new Door()
    this.doors.push(door)
    door.rooms[0] = this
    door.position[0] = position
    switch (position[0]) {
      case 'top':
        door.x = this.x + position[1]
        door.y = this.y
        break
      case 'bottom':
        door.x = this.x + position[1]
        door.y = this.y + this.height
        break
      case 'left':
        door.x = this.x
        door.y = this.y + position[1]
        break
      case 'right':
        door.x = this.x + this.width
        door.y = this.y + position[1]
        break
    }
    return door
  }
}

class Door {
  x = 0
  y = 0

  rooms = [null, null]
  position = [null, null]
  locked = 0
  secret = null

  constructor (door) {
    Doors.push(this)
  }

  addRoom (room, position) {
    this.rooms[1] = room
    room.doors.push(this)
    switch (this.position[0][0]) {
      case 'top':
        room.x = this.x - position
        room.y = this.y - room.height
        break
      case 'bottom':
        room.x = this.x - position
        room.y = this.y
        break
      case 'left':
        room.x = this.x - room.width
        room.y = this.y - position
        break
      case 'right':
        room.x = this.x
        room.y = this.y - position
        break
    }
    return room
  }

  getPosition (room) { return this.rooms[0] === room ? this.position[0] : this.position[1] }
  getOtherSide (room) { return this.rooms[0] === room ? this.rooms[1] : this.rooms[0] }
}

let canvas
let ctx

function paint (root) {
  drawRoom(root)
}

function drawRoom (room) {
  ctx.strokeRect(room.x * UNIT, room.y * UNIT, room.width * UNIT, room.height * UNIT)
  if (room.type === STAIR) {
    if (room.height > room.width) {
      for (let i = 1; i < room.height * 2; i++) {
        ctx.beginPath()
        ctx.moveTo(room.x * UNIT, room.y * UNIT + i * UNIT / 2)
        ctx.lineTo(room.x * UNIT + UNIT, room.y * UNIT + i * UNIT / 2)
        ctx.stroke()
      }
    } else {
      for (let i = 1; i < room.width * 2; i++) {
        ctx.beginPath()
        ctx.moveTo(room.x * UNIT + i * UNIT / 2, room.y * UNIT)
        ctx.lineTo(room.x * UNIT + i * UNIT / 2, room.y * UNIT + UNIT)
        ctx.stroke()
      }
    }
  }
  for (const door of room.doors) {
    if (door.rooms[0] !== room) continue
    const position = door.getPosition(room)
    let doorX, doorY
    switch (position[0]) {
      case 'top':
      case 'bottom':
        doorX = door.x * UNIT + (UNIT - DOOR_WIDTH) / 2
        doorY = door.y * UNIT + -DOOR_HEIGHT / 2
        ctx.strokeRect(doorX, doorY, DOOR_WIDTH, DOOR_HEIGHT)
        if (door.lock) {
          ctx.beginPath()
          ctx.arc(door.x * UNIT + UNIT / 2, door.y, LOCK_R, 0, 2 * Math.PI)
          ctx.fill()
        }
        break
      case 'left':
      case 'right':
        doorX = door.x * UNIT - DOOR_HEIGHT / 2
        doorY = door.y * UNIT + (UNIT - DOOR_WIDTH) / 2
        ctx.strokeRect(doorX, doorY, DOOR_HEIGHT, DOOR_WIDTH)
        break
    }
    if (door.rooms[1]) {
      drawRoom(door.rooms[1])
    }
  }
}

const LEFT = 0
const TOP = 1
const RIGHT = 2
const BOTTOM = 3

function dice (min, max) {
  if (max === undefined) {
    max = min
    min = 1
  }
  return min + Math.floor(Math.random() * (max - min + 1))
}

const DOOR_DIRECTION = {
  left: ['left', 'top', 'bottom'],
  right: ['right', 'bottom', 'top'],
  top: ['top', 'right', 'left'],
  bottom: ['bottom', 'left', 'right']
}

function isColliding (r1, r2) {
  if (r1[0] >= r2[2]) return false
  if (r1[2] <= r2[0]) return false
  if (r1[1] >= r2[3]) return false
  if (r1[3] <= r2[1]) return false
  return true
}

function getCheckRect (direction, x, y, width) {
  switch (direction) {
    case 'left':
      return [x - (2 * width + 1), y - width, x, y + width + 1]
    case 'right':
      return [x, y - width, x + (2 * width + 1), y + width + 1]
    case 'top':
      return [x - width, y - (2 * width + 1), x + width + 1, y]
    default: // bottom
      return [x - width, y, x + width + 1, y + (2 * width + 1)]
  }
}

function CalcRoomPosition (door, room, openDirection, doorPosition) {
  switch (openDirection) {
    case 'left':
      return [door.x - room.width, door.y - doorPosition]
    case 'top':
      return [door.x - doorPosition, door.y - room.height]
    case 'right':
      return [door.x, door.y - doorPosition]
    default:
      return [door.x - doorPosition, door.y]
  }
}

function createSegment (door, type, sizer, doors) {
  const rects = Rooms.map(room => [room.x, room.y, room.x + room.width, room.y + room.height])
  const doorRects = Doors.filter(d => !d.rooms[1] && door !== d).map(door => {
    return getCheckRect(door.position[0][0], door.x, door.y, 0)
  })
  const checkRects = [...rects, ...doorRects]
  const doorDirection = door.position[0][0]
  const room = new Room()
  room.type = type
  switch (type) {
    case ROOM:
      [room.width, room.height] = sizer()
      break
    case CORRIDOR:
      [room.width, room.height] = [[1, 12], [12, 1]][dice(0, 1)]
      // if (doorDirection === 'left' || doorDirection === 'right') {
      //   [room.width, room.height] = [12, 1]
      // } else {
      //   [room.width, room.height] = [1, 12]
      // }
      break
    case STAIR :
      if (doorDirection === 'left' || doorDirection === 'right') {
        [room.width, room.height] = [2, 1]
      } else {
        [room.width, room.height] = [1, 2]
      }
  }

  let doorOffset
  if (doorDirection === 'left' || doorDirection === 'right') {
    doorOffset = room.height
  } else {
    doorOffset = room.width
  }

  const offsets = [...Array(doorOffset).keys()]
  while (offsets.length > 0) {
    const offset = offsets.splice(dice(0, offsets.length - 1), 1)[0]
    const [x, y] = CalcRoomPosition(door, room, doorDirection, offset)
    const roomRect = [x, y, x + room.width, y + room.height]
    const collides = checkRects.filter(rect => isColliding(rect, roomRect))
    if (collides.length === 0) {
      doorOffset = offset
      break
    } else {
      if (offsets.length === 0) {
        return
      }
    }
  }

  door.addRoom(room, doorOffset)
  for (let i = 0; i < doors; i++) {
    const direction = DOOR_DIRECTION[door.position[0][0]][i % 3]
    let offset = 0
    if (direction === 'left' || direction === 'right') {
      offset = dice(0, room.height - 1)
    } else {
      offset = dice(0, room.width - 1)
    }
    room.addDoor([direction, offset])
  }
  return room
}

// const SMALL = () => ([dice(2, 3), dice(2, 3)])
// const MIDDLE = () => ([dice(4, 5), dice(4, 5)])
// const WIDE = () => ([dice(3, 4), dice(6, 7)])
// const LARGE = () => ([dice(6, 7), dice(6, 7)])

const SMALL = () => ([2, 2])
const MIDDLE = () => ([3, 3])
const WIDE = () => ([[2, 4], [4, 2]][dice(0, 1)])
const LARGE = () => ([4, 4])

const OPEN_DOOR = {
  [STAIR]: [[CORRIDOR, null, 1], [CORRIDOR, null, 2], [CORRIDOR, null, 2], [CORRIDOR, null, 2], [CORRIDOR, null, 3], [CORRIDOR, null, 3]],
  [CORRIDOR]: [[ROOM, SMALL, 1], [ROOM, MIDDLE, 1], [ROOM, WIDE, 1], [ROOM, WIDE, 2], [ROOM, LARGE, 2], [STAIR, null, 1]],
  [ROOM]: [[ROOM, SMALL, 1], [ROOM, MIDDLE, 0], [ROOM, MIDDLE, 0], [ROOM, WIDE, 0], [ROOM, LARGE, 0], [STAIR, null, 1]]
}

let maxDepth = 0

function openDoors (root, depth = 0) {
  maxDepth = Math.max(depth, maxDepth)
  for (const door of root.doors) {
    if (door.rooms[0] !== root || door.rooms[1]) continue
    const seg = createSegment(door, ...(OPEN_DOOR[root.type][dice(0, 5)]))
    if (!seg) {
      return
    }
    if (seg.type !== STAIR) {
      openDoors(seg, depth)
    } else {
      // openDoors(seg, depth + 1)
    }
  }
}

window.onload = () => {
  canvas = document.getElementById('canvas')
  ctx = canvas.getContext('2d')
  // const root = new Room()
  // root.type = ROOM
  // root.width = 5
  // root.height = 5

  // root.addDoor(['left', 2])
  // root.addDoor(['right', 2])

  const stair = new Room()
  stair.type = STAIR
  stair.width = 1
  stair.height = 2

  stair.addDoor(['bottom', 0])

  // root.addDoor(['bottom', 2]).addRoom(stair, 0)

  // openDoors(root)

  openDoors(stair)

  // const corridor = new Room()
  // corridor.type = CORRIDOR
  // corridor.width = 12
  // corridor.height = 1
  // corridor.addDoor(['bottom', 11])
  // corridor.addDoor(['right', 0])

  // const stair = new Room()
  // stair.type = STAIR
  // stair.width = 1
  // stair.height = 2
  // Doors[0].addRoom(stair, 0)

  // const bigRoom = new Room()
  // bigRoom.type = ROOM
  // bigRoom.height = 7
  // bigRoom.width = 3
  // Doors[1].addRoom(bigRoom, 5)

  // bigRoom.addDoor(['bottom', 0])

  let mouse = null
  const translate = [400, 150]

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(...translate)
    paint(stair)
    ctx.restore()
  }

  canvas.onmousedown = (e) => {
    mouse = [e.x, e.y]
  }

  canvas.onmousemove = (e) => {
    if (!mouse) return
    translate[0] += e.x - mouse[0]
    translate[1] += e.y - mouse[1]

    mouse[0] = e.x
    mouse[1] = e.y

    render()
  }

  canvas.onmouseup = (e) => {
    mouse = null
  }

  render()

  console.log(Rooms.length, maxDepth)
}
