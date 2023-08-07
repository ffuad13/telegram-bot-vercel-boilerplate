import {ObjectId} from 'mongodb'

class TimeUser {
	constructor(public teleId: number, public token: string, public usedTemplate: number, public id?: ObjectId) {}
}

class TimePlate {
	constructor(public teleId: number, public tmpObj: object, public id?: ObjectId) {}
}

export {TimeUser, TimePlate}