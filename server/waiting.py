import asyncio
import aiotools
import socketio
import re, random
from collections import defaultdict
import time


DEATH_CLOCK_EMPTY = 10
DEATH_CLOCK_IDLE = 300


def get_game_data(game):
    if (game == 'secret'):
        return {'maxPlayers': 10,
                'minPlayers': 5,
                'name': 'Secret Hitler'}

class WaitingHandler(socketio.AsyncNamespace):

    async def room_killer(self, interval):

        print(self.user_sessions)
        print(self.all_rooms)

        current_time = time.time()

        to_delete = [key for key in self.all_rooms if
                     self.all_rooms[key]['time_until_death'] < current_time]

        for room_key in to_delete:
            await self.emit('room_killed', room=room_key)
            await self.close_room(room_key)
            del self.all_rooms[room_key]

    async def spawn_killer(self):
        self.t = aiotools.create_timer(self.room_killer, DEATH_CLOCK_EMPTY)



    def __init__(self, path):

        with open("server/words.txt", "r") as words_f:
            self.ALL_WORDS = words_f.read().split('\n')

        self.killer_spawned = False
        self.t = None

        self.user_sessions = defaultdict(dict)
        self.all_rooms = dict()
        self.ip_rooms = defaultdict(int)

        self.username_pattern = re.compile(r'[A-Za-z0-9][A-Za-z0-9 ]{2,15}')

        super().__init__(path)

    async def on_connect(self, sid, environ):

        self.user_sessions[sid]['ip'] = environ['REMOTE_ADDR']
        if not self.killer_spawned:
            await self.spawn_killer()
            self.killer_spawned = True


    def on_disconnect(self, sid):

        del self.user_sessions[sid]
        for room in self.all_rooms:
            if sid in self.all_rooms[room]['members']:
                self.all_rooms[room]['members'].remove(sid)
        pass

    async def on_register_username(self, sid, data):

        if type(data) != str:
            return "There was a communication error. Please don't do that again.", False

        if len(data) < 3 or len(data) > 16:
            return "That username is invalid. Please double-check to make sure everything's spelled correctly.", False
        if not self.username_pattern.fullmatch(data):
            return "That username is invalid. Please double-check to make sure everything's spelled correctly.", False


        if 'username' in self.user_sessions[sid]:
            return "There was a problem determining your username. Please try connecting again.", False

        self.user_sessions[sid]['username'] = data
        return "", True



    async def on_create(self, sid, game):

        if type(game) != str:
            return "There was a communication error. Please don't do that again.", False

        if 'username' not in self.user_sessions[sid]:
            return "There was a communication error. Please try connecting again.", False

        if game not in ['secret']:
            return "There was a communication error. Please try connecting again.", False


        ip = self.user_sessions[sid]['ip']
        if self.ip_rooms[ip] >= 3:
            return "You already have too many rooms! Please try removing some.", False


        # generate room code
        for _ in range(100):
            code = " ".join([random.choice(self.ALL_WORDS),
                             random.choice(self.ALL_WORDS)])

            if code not in self.all_rooms:
                self.all_rooms[code] = {
                    "game": game,
                    "time_until_death": time.time() + DEATH_CLOCK_EMPTY - 0.1,
                    "members": []
                }

                break
        else:
            return "There are too many active rooms right now.", False

        self.ip_rooms[ip] += 1

        return code, True

    async def on_join(self, sid, data):

        if type(data) != list:
            return "There was a communication error. Please don't do that again.", False

        if len(data) != 2:
            return "There was a communication error. Please don't do that again.", False

        room_code = data[0]
        game = data[1]

        if type(room_code) != str:
            return "There was a communication error. Please don't do that again.", False
        if type(game) != str:
            return "There was a communication error. Please don't do that again.", False

        if len(self.rooms(sid)) > 1:
            return "You are already in a game! Please try again.", False

        if 'username' not in self.user_sessions[sid]:
            return "There was a communication error. Please try connecting again.", False

        if room_code not in self.all_rooms:
            return "The room code you entered is invalid. Please try again.", False

        if self.all_rooms[room_code]['game'] != game:
            return "The room code you entered is invalid. Please try again.", False


        room = self.all_rooms[room_code]
        room['time_until_death'] = time.time() + DEATH_CLOCK_IDLE
        room['members'].append(sid)
        self.enter_room(sid, room_code)

        await self.emit('player_list_update',
                        [self.user_sessions[sid]['username'] for sid in room['members']],
                        room=room_code)
        return get_game_data(game), True







