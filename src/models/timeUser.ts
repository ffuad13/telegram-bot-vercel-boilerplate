import {ObjectId} from 'mongodb'

class TimeUser {
	constructor(public teleId: number, public token: string, public id?: ObjectId) {}
}

class TimePlate {
	constructor(public userId: ObjectId, public payload: object, public id?: ObjectId) {}
}

export {TimeUser, TimePlate}