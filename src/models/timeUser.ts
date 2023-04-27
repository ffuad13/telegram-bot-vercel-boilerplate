import {ObjectId} from 'mongodb'

class TimeUser {
	constructor(public teleId: number, public token: string, public id?: ObjectId) {}
}

export {TimeUser}