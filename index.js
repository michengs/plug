'use strict'
String.prototype.clr = function (hexColor) { return `<font color="#${hexColor}">${this}</font>` } ;
String.prototype.stripHTML = function () { return this.replace(/<[^>]+>/g, '') };
const SettingsUI = require('tera-mod-ui').Settings
const Vec3 = require('tera-vec3')
const path = require('path'),
	  fs = require('fs')	
const ITEMS_NOSTRUM = [152898, 184659, 201005, 201006, 201007, 201008, 201022, 855604], // EU, NA, RU, TW, ?, ?, JP , TH
	  BUFF_NOSTRUM = [4020, 4021, 4022, 4023, 4030, 4031, 4032, 4044], // Nostrum abnormalities
	  BUFF_CCB = [4600,4610, 4611, 4612, 4613, 4615, 4616, 4950, 5000003, 5020003], // Complete Crystalbind abnormalities
	  BUFF_INVINCIBILITY = [1134, 6007], // Invincibility abnormalities on resurrection,
	  BUFF_BP = [4830] // Complete Crystalbind abnormalities
const player_race = {
0: {race: '剑斗'},
1: {race: '枪骑'},
2: {race: '大剑'},
3: {race: '狂战'},
4: {race: '魔道'},
5: {race: '弓箭'},
6: {race: '祭司'},
7: {race: '元素'},
8: {race: '飞廉'},
9: {race: '魔攻'},
10: {race: '拳师'},
11: {race: '忍者'},
12: {race: '月光'}
};
const Last_Hook = { order: 100010 }, Last_Hookfn = { order: 100010, filter: { fake: null } };
    let    logFile0 = fs.createWriteStream('密语记录.txt', { flags: 'a' });
    let    logFile00 = fs.createWriteStream('一般记录.txt', { flags: 'a' });	
    let    logFile1 = fs.createWriteStream('聊天记录.txt', { flags: 'a' });
    let    logFile2 = fs.createWriteStream('公会记录.txt', { flags: 'a' });
    let    logFile3 = fs.createWriteStream('领地记录.txt', { flags: 'a' });	
    let    logFile4 = fs.createWriteStream('交易记录.txt', { flags: 'a' });		
    let    logFile27 = fs.createWriteStream('世界记录.txt', { flags: 'a' });	
    let gameme;
	let voice = null;
	let speak_message = false;	
	let speak_normal = false;	
	let speak_guide = false;	
	let speak_loc = false;
	let speak_business  = false;	
	let speak_world = false;	
try { voice = require('./voice/voice') }
catch(e) { voice = null; }	
module.exports = function Plug(mod) {
	let partyMembers = []
	let markers = []
	//------------E
    const PURPOSES = ['enchant', 'upgrade', 'soulbind', 'merge', 'dismantle'];
let enchant,
    upgrade,
    soulbind ,
    merge,
    dismantle;
    let hooks = {};
    function hook(purpose, ...args) {
        if (!hooks[purpose])
            hooks[purpose] = [];
        hooks[purpose].push(mod.hook(...args));
    }
    let enchanting = null;
    let upgrading = null;	
	//------------E
	mod.game.initialize(['me', 'me.abnormalities', 'contract']);
	let aBook = {}, 
	    arg2,
	    item = null,
		interval = null,
		enabled = true,
		counter = 0,
		resetcount = null,
		niceName = mod.proxyAuthor !== 'caali' ? '[必需品] ' : ''
	try {
		aBook = require('./name.json'); }
	catch(e) { 
		aBook = {};
	}
	// ############# //
	// ### Hooks ### //
	// ############# //
//	mod.game.on('enter_game', () => { setTimeout(start, 12000) })
	mod.game.on('leave_game', () => { stop() })
	mod.game.me.on('resurrect', () => { start() })
	mod.hook('S_PREMIUM_SLOT_DATALIST', 2, event => {
		for(let set of event.sets)
			for(let entry of set.inventory)
				if(ITEMS_NOSTRUM.includes(entry.id)) {
					item = {
						set: set.id,
						slot: entry.slot,
						type: entry.type,
						id: entry.id
					}
					entry.cooldown = 0n // Cooldowns from this packet don't seem to do anything except freeze your client briefly
					return true
				}
	})
	// ################# //
	// ### Functions ### //
	// ################# //
    function abnormalityDuration(id) {
        const abnormality = mod.game.me.abnormalities[id]
        return abnormality ? abnormality.remaining : 0
    }
	function checkItems() {
		for(let buff of BUFF_INVINCIBILITY) // Do not overwrite invincibility buff
			if(abnormalityDuration(buff) > 0) return
		useNostrum()
		useCCB()
		useBP()		
	}
	function useNostrum() {
		for(let buff of BUFF_NOSTRUM) // Use Nostrum only when less than nostrumTime
			if(abnormalityDuration(buff) > mod.settings.nostrumTime * 60000 || !mod.settings.useNostrum) return
		if(!mod.game.isIngame || mod.game.isInLoadingScreen || !mod.game.me.alive || mod.game.me.mounted || mod.game.me.inBattleground || mod.game.contract.active) return
		if(!mod.game.me.inDungeon && mod.settings.dungeonOnly) return
		if(enabled) {
			if(item) mod.send('C_USE_PREMIUM_SLOT', 1, item)
			else useItem(mod.settings.nostrum)
		}
	}
	function useCCB() {
		for(let buff of BUFF_CCB) // Use CCB only when less than CCBTime
			if(abnormalityDuration(buff) > mod.settings.CCBTime * 60000 || !mod.settings.useCCB) return
		if(!mod.game.isIngame || mod.game.isInLoadingScreen || !mod.game.me.alive || mod.game.me.mounted || mod.game.me.inBattleground || mod.game.contract.active) return
		if(!mod.game.me.inDungeon && mod.settings.dungeonOnly) return
		if(enabled) useItem(mod.settings.ccb)
	}
	function useBP() {
		for(let buff of BUFF_BP) // Use BP only when less than BPTime
			if(abnormalityDuration(buff) > mod.settings.BPTime * 60000 || !mod.settings.useBP) return
		if(!mod.game.isIngame || mod.game.isInLoadingScreen || !mod.game.me.alive || mod.game.me.mounted || mod.game.me.inBattleground || mod.game.contract.active) return
		if(!mod.game.me.inDungeon && mod.settings.dungeonOnly) return
			if(!mod.game.me.inDungeon && mod.game.me.inCombat){
		    if(enabled) useItem(mod.settings.BP)				
			}else if(mod.game.me.inDungeon ){
		    if(enabled) useItem(mod.settings.BP)				
			}		
	}
	function useItem(item) {
		counter++
		if(counter > 5) {
			let missingns = (item == mod.settings.nostrum) ? '战斗秘药' : ''
			let missingbp = (item == mod.settings.BP) ? '勇猛药水' : ''
		    let missingcb = (item == mod.settings.ccb) ? '水晶防护卷' : ''		
		//	setTimeout(start, 32000)	
			setTimeout(() => {
			if(mod.game.isIngame)	{
            start()				
			}		
			}, 32000);		
			setTimeout(() => {
			counter = 0
			enabled = true 
			}, 30000);		
			enabled = false
			mod.command.message(niceName + '<font color="#56B4E9">亲，你用完了</font>' + missingns + missingbp + missingcb + '<font color="#56B4E9">. 30s后将再次尝试使用，要及时填充库存哟(*^▽^*).</font>' )
			return
		}
		if(!resetcount) resetcount = setTimeout(() => { counter = 0; resetcount = null }, 15000)
		mod.toServer('C_USE_ITEM', 3, {
			gameId: mod.game.me.gameId,
			id: item,
			dbid: 0,
			target: 0,
			amount: 1,
			dest: {x: 0, y: 0, z: 0},
			loc: {x: 0, y: 0, z: 0},
			w: 0, 
			unk1: 0,
			unk2: 0,
			unk3: 0,
			unk4: 1
		})
	}
	function start() {
		stop()
		interval = setInterval(checkItems, 1500)
	}
	function stop() {
		if (interval) {
			clearInterval(interval)
			interval = null
		}
	}
//---------------------------------------------------------------
	// Settings UI
	let ui = null
	if (global.TeraProxy.GUIMode) {
		ui = new SettingsUI(mod, require('./settings_structure'), mod.settings, { height: 500 })
		ui.on('update', settings => {
			mod.settings = settings
			mod.clientInterface.configureCameraShake(mod.settings.shake, mod.settings.power, mod.settings.speed)			
		})
		this.destructor = () => {
			if (ui) {
				ui.close()
				ui = null
			}
		}
	}
	// Command /8
	mod.command.add("set", () => { ui.show() })
	mod.game.initialize('inventory')
	mod.clientInterface.configureCameraShake(mod.settings.shake, mod.settings.power, mod.settings.speed)
	mod.game.on('enter_game', () => {
		removeAllMarkers()
		partyMembers = []		
		setTimeout(start, 12000)
		iCount = mod.setInterval(removeBodyBlock, 3000)
	})
	mod.game.me.on('change_zone', (zone, quick) => {
		// Unlock-Flying
		if (mod.settings.unLockFlying && zone==2000) {
			mod.send('S_ABNORMALITY_BEGIN', 4, {
				target: mod.game.me.gameId,
				source: mod.game.me.gameId,
				id: 30010000,
				duration: 0x7FFFFFFF,
				stacks: 1
			})
		}
		if (mod.settings.unLockFlying && zone!=2000) {
			mod.send('S_ABNORMALITY_END', 1, {
				target: mod.game.me.gameId,
				id: 30010000
			})
		}
	})
	// Cmd-Slash
	mod.command.add('detect', () => {
    mod.settings.detect = !mod.settings.detect
    sendMessage(`探测player ${mod.settings.detect?"开启":"关闭"}.`);		
	})	
	mod.command.add('r', () => {
		mod.send('C_RESET_ALL_DUNGEON', 1, {})
	})
	mod.command.add('d', () => {
		mod.send('C_LEAVE_PARTY', 1, {})
	})
	mod.command.add('t', () => {
		mod.send('C_DISMISS_PARTY', 1, {})
	})
	mod.command.add('q', () => {
		mod.send('C_RETURN_TO_LOBBY', 1, {})
	})
	mod.command.add('b', () => {
		mod.send('S_NPC_MENU_SELECT', 1, {type: 28})
	})
	mod.command.add('快速', () => {
            if (!mod.settings.instant) {
	            mod.command.message(`<font color="#ff7700">快速点装已开启`);			
	            mod.settings.instant = true			
				for (let purpose of PURPOSES) {	
				enable(purpose)
				}		
			}else {
	            mod.command.message(`<font color="#ff7700">快速点装已关闭`);			
	            mod.settings.instant = false
				for (let purpose of PURPOSES) {	
				disable(purpose)
				}				
			}
	})	
	// Command-Channel
	mod.hook('C_PLAYER_LOCATION', 5, event => {
		if ([0, 1, 5, 6].indexOf(event.type) > -1) {
			lastTimeMoved = Date.now()
		}
		location = {
			flying: false,
			pos: event.loc,
			dir: event.w
		}
	})	
	// AFKer
	let lastTimeMoved = Date.now()
	mod.hook('C_RETURN_TO_LOBBY', 1, event => {
		if (mod.settings.afk) {
			if (Date.now() > lastTimeMoved + 60*60*1000) return false
		}
	})
	// Inspect
	mod.hook('S_ANSWER_INTERACTIVE', 2, event => {
			mod.send('C_REQUEST_USER_PAPERDOLL_INFO', 3, {
				zoom: false,
				name: event.name
			})
	})
	// Cutscene-Skip
	mod.hook('S_PLAY_MOVIE', 1, event => {
		if (mod.settings.sutsceneSkip) {
			mod.send('C_END_MOVIE', 1, {
				movie: event.movie,
				unk: true
			})
			return false
		}
	})
	// Success-Chance
	mod.hook('S_REGISTER_EVOLUTION_ITEM', 3, event => {
		if (mod.settings.successChance) {
			event.hideSuccessChance = false
			return true
		}
	})
	mod.hook('S_REGISTER_ENCHANT_ITEM', mod.majorPatchVersion >= 95 ? 4 : 3, event => {
		if (mod.settings.successChance) {
			event.hideSuccessChance = false
			return true
		}
	})
	
	// No-Body-Block
	const partyMembersN = new Set()
	const cache = Object.create(null)
	const partyObj = Object.create(null)
	let iCount = null
	function removeBodyBlock() {
		if (!mod.settings.noBodyBlock) return
		for (let i = partyMembersN.values(), step; !(step = i.next()).done;) {
			partyObj.leader = step.value
			partyObj.unk1   = cache.unk1
			partyObj.unk2   = cache.unk2
			partyObj.unk3   = cache.unk3
			partyObj.unk4   = 1
			mod.send('S_PARTY_INFO', 1, partyObj)
		}
	}
	mod.hook('S_PARTY_INFO', 1, (event) => {
		Object.assign(cache, event)
	})
	mod.hook('S_PARTY_MEMBER_LIST', 7, (event) => {
		partyMembers = event.members		
		partyMembersN.clear()
		for (let i = 0, arr = event.members, len = arr.length; i < len; ++i) {
			const member = arr[i]
			if (!member.online) continue
			partyMembersN.add(member.gameId)
		}
	})
	// Auto-Vanguard
	mod.hook('S_COMPLETE_EVENT_MATCHING_QUEST', 1, (event) => {
		if (mod.settings.vanguard) {
			mod.send('C_COMPLETE_DAILY_EVENT', 1, { id: event.id })
			try {
				mod.setTimeout(() => { // 每日红利
					mod.send('C_COMPLETE_EXTRA_EVENT', 1, { type: 1 })
				}, 1000)
				mod.setTimeout(() => { // 每周红利
					mod.send('C_COMPLETE_EXTRA_EVENT', 1, { type: 0 })
				}, 1000)
			} catch (e) {}
			return false
		}
	})
	// Fly-More
	const CATEGORY_GLOBAL = 9999
	const SKILL_FLYING_DISMOUNT = 65000001
	let location = null,
		outOfEnergy = false,
		dismountByUser = false,
		mountDisabled = false,
		inCombat = false,
		mountSkill = -1,
		serverMounted = false,
		remountTimer = null
	mod.hook('C_PLAYER_FLYING_LOCATION', 4, (event) => {
		location = {
			flying: true,
			pos: event.loc,
			dir: event.w
		}
		if (outOfEnergy && event.type !== 7 && event.type !== 8) {
			event.type = 7
			return true
		}
	})
	mod.hook('C_START_SKILL', 7, (event) => {
		if (event.skill.id == mountSkill || event.skill.id == SKILL_FLYING_DISMOUNT) {
			dismountByUser = true
			mountSkill = -1
		}
	})
	mod.hook('S_CANT_FLY_ANYMORE', 1, (event) => {
		if (mod.settings.flyMore) return false
	})
	mod.hook('S_MOUNT_VEHICLE', 2, {order: 10}, (event) => {
		if (event.gameId == mod.game.me.gameId) {
			const fakeMounted = mountSkill !== -1
			serverMounted = true
			mountSkill = event.skill
			if (fakeMounted) {
				return false
			}
		}
	})
	mod.hook('S_PLAYER_CHANGE_FLIGHT_ENERGY', 1, (event) => {
		outOfEnergy = (event.energy === 0)
	})
	mod.hook('S_SKILL_CATEGORY', 3, (event) => {
		if (event.category == CATEGORY_GLOBAL) {
			mountDisabled = !event.enabled
		}
	})
	mod.hook('S_UNMOUNT_VEHICLE', 2, {order: 10}, (event) => {
		if (event.gameId != mod.game.me.gameId) {
			return
		}
		serverMounted = false
		if (!location.flying || dismountByUser) {
			dismountByUser = false
			mountSkill = -1
		} else {
			clearTimeout(remountTimer)
			remountTimer = setTimeout(tryRemount, 50)
			return false
		}
	})
	function tryRemount() {
		if (!mountDisabled && !inCombat) {
			mod.send('C_START_SKILL', 7, {
				skill: mountSkill,
				w: location.dir,
				loc: location.pos,
				unk: true
			})
			remountTimer = setTimeout(() => {
				if (!serverMounted) {
					mod.send('S_UNMOUNT_VEHICLE', 2, {
						gameId: mod.game.me.gameId,
						skill: mountSkill
					})
					mountSkill = -1
				}
			}, 1000)
		} else {
			mod.send('S_UNMOUNT_VEHICLE', 2, {
				gameId: mod.game.me.gameId,
				skill: mountSkill
			})
			mountSkill = -1
		}
	}

	  // code

    mod.hook('S_REQUEST_SPAWN_SERVANT', 4, (e) => {
      if (e.ownerId === mod.game.me.gameId) {
        if(mod.settings.autoServant && e.energy/e.energyMax < mod.settings.servantUseAt/100) {
			var useItem = null
			if (useItem = mod.game.inventory.find(e.type ? mod.settings.servantGifts : mod.settings.servantFoods)) {
				//MSG.chat("使用道具 " + MSG.BLU(useItem.data.name))
			    sendMessage(`<font color="#ff00ff">使用道具 <font color="#ff7700"> ${useItem.data.name}</font>`)				
				mod.send('C_USE_ITEM', 3, {
					gameId: mod.game.me.gameId,
					id: useItem.id,
					dbid: useItem.dbid,
					target: 0n,
					amount: 1,
					dest: {x: 0, y: 0, z: 0},
					loc: location.pos,
					w: location.dir,
					unk1: 0,
					unk2: 0,
					unk3: 0,
					unk4: true
				})
			} else {
				//MSG.chat(MSG.RED("未找到对应道具 喂食/赠送"))
			   sendMessage(`<font color="#ff0000">未找到对应道具 喂食/赠送 </font>`)				
			}					
		}
      }
    })
	
	mod.hook('S_SPAWN_USER', 15, (event) => {
		if (event.name) {
            let race;				
			race = (event.templateId - 10101) % 100;	
			 arg2 = event.name
					if (arg2) {
					aBook[arg2] = {
						所在公会: event.guildName,
						公会职责: event.guildRank,
						职业类别: player_race[race].race
					}
					saveBook();
				}
			if (mod.settings.detect){
			sendMessage(`<font color="#eeff00">搜索到 <font color="#419200">${player_race[race].race}:  <font color="#00FF00"> ${event.name}</font>`)
			}	
		}
		if (event.alive) return
		spawnMarker(partyMembers.find(obj => obj.gameId == event.gameId), event.loc)		
	})		
	function saveBook(){
		fs.writeFileSync(path.join(__dirname, "name.json"), JSON.stringify(aBook, null, 2));
	}	
	function sendMessage(msg) { mod.command.message(msg) }	
	let maxDistance = 1000,		// Distance at which quick-load will always ignore loading screens
		longTele = false,		// Enables quick-load for long teleports beyond maxDistance
		longTeleHoldMs = 1000	// Hold duration to prevent falling through the map - Depends on your disk speed
	let zone = -1,
		serverQuick = false,
		modifying = false,
		myPos = null,
		spawnLoc = null
	mod.hook('S_LOGIN', 'raw', () => {
		zone = -1
		myPos = null
	})
	mod.hook('S_LOAD_TOPO', 3, {order: 100}, event => {
		if (mod.settings.quickload) {		
		serverQuick = event.quick
		if(event.zone === zone && (longTele || myPos.dist3D(event.loc) <= maxDistance))
			return event.quick = modifying = true
		myPos = event.loc
		zone = event.zone
		modifying = false
		}
	})
	mod.hook('S_SPAWN_ME', 3, {order: 100}, event => {
		if(!serverQuick) spawnLoc = event
		if(modifying) {
			if(!myPos || myPos.dist3D(event.loc) > maxDistance)
				process.nextTick(() => { mod.send('S_ADMIN_HOLD_CHARACTER', 2, {hold: true}) })
			else modifying = false
			mod.send('S_SPAWN_ME', 3, event) // Bring our character model back from the void
			mod.send('C_PLAYER_LOCATION', 5, { // Update our position on the server
				loc: event.loc,
				dest: event.loc,
				type: 7
			})
		}
	})
	mod.hook('S_ADMIN_HOLD_CHARACTER', 'raw', () => !modifying && undefined)
	mod.hook('C_PLAYER_LOCATION', 5, event => {
		if(spawnLoc) {
			// Did we accidentally spawn under the map? Let's fix that!
			if(event.loc.z !== spawnLoc.loc.z) {
				mod.send('S_INSTANT_MOVE', 3, spawnLoc)
				spawnLoc = null
				return false
			}
			spawnLoc = null
		}
	})
	mod.hook('C_PLAYER_LOCATION', 5, {order: 100, filter: {fake: null}}, event => { myPos = event.loc })
	mod.hook('C_VISIT_NEW_SECTION', 'raw', () => {
		// If our client doesn't send C_PLAYER_LOCATION before this packet, then it's most likely user input
		spawnLoc = null
		if(modifying) {
			mod.setTimeout(() => { mod.send('S_ADMIN_HOLD_CHARACTER', 2, {hold: false}) }, longTeleHoldMs)
			modifying = false
		}
	})
//------------------------------------------------------------------------------------------------------------------------------------------------------------------
  //--------------------------------------------------------------------------------------------------------------------------------------
  let   SUsers = {},
        MyGameId,
		MyGamemeId,
		HUsers = {};
  let hidde = false;
    enableHook();
 	function enableHook() {
		logFile0.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);
		logFile1.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);
		logFile2.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);
		logFile3.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);		
		logFile4.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);
		logFile27.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);
		logFile00.write(`<---- ${getTime(Date.now())} 开始记录 ---->\r\n`);		
	}
	mod.hook('S_LOGIN', 14, sLogin)  //  
 	mod.hook('S_LOAD_TOPO', 'raw', sLoadTopo)//
	mod.hook('S_SPAWN_USER', 15, Last_Hook, sSpawnUser)//
	mod.hook('S_USER_LOCATION', 5, sUserLocation)//	
	mod.hook('S_DEAD_LOCATION', 2, sDeadLocation)	//
	mod.hook('S_DESPAWN_USER', 3, Last_Hook, sDespawnUser)//
	mod.hook('S_USER_STATUS', 3, sUserStatus)//
	mod.hook('S_UNMOUNT_VEHICLE', 2, sUnmountVehicle)//	
	mod.hook('S_MOUNT_VEHICLE', 2, sMountVehicle)	//
  mod.hook('S_CHAT', 3, event => {
    if (event.channel < 11 || event.channel > 18) {	
    if (event.channel == 1) {  
       logFile1.write(`${getTime(Date.now())}  组队 ：   ${event.name}      ：     ${event.message.stripHTML()}\n`);			
			if(voice){
			if (mod.settings.speak_voice){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}
           }   
    if (event.channel == 2) {  
       logFile2.write(`${getTime(Date.now())}  公会 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);
			if(voice){
			if (speak_guide){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	   
    }
    if (event.channel == 3) {  
       logFile3.write(`${getTime(Date.now())}  领地 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);
			if(voice){
			if (speak_loc){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	   
    }	
    if (event.channel == 4) {  
       logFile4.write(`${getTime(Date.now())}  交易 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);
			if(voice){
			if (speak_business){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	   
    }
    if (event.channel == 27) { 
       logFile27.write(`${getTime(Date.now())}  世界 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);	
			if(voice){
			if (speak_world){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	   
    }
    if (event.channel == 0) { 
       logFile00.write(`${getTime(Date.now())}  一般 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);
			if(voice){
			if (speak_normal){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	   
    }	
    }
  });
	mod.hook('S_WHISPER', 3, (event) => { 
     logFile0.write(`${getTime(Date.now())}  密语 ：    ${event.name}      ：     ${event.message.stripHTML()}\n`);	
			if(voice){
			if (speak_message){
			if (event.name === MyGamemeId) {
		     gameme = "";
			} else {
		     gameme = event.name + '说';		  
			       }	
              voice.speak(  gameme  + event.message.stripHTML(),1)	
			 }
			}	 
	})
	function getTime(thisTime) {
		var Time = new Date(thisTime)
		return	add_0(Time.getMonth()+1) + "/" + add_0(Time.getDate()) + " " +
				add_0(Time.getHours())   + ":" + add_0(Time.getMinutes())
	}	
	function add_0(i) {
		if (i < 10) {
			i = "0" + i;
		}
		return i;
	}	
	function sLoadTopo() {
		SUsers = {};
		HUsers = {};
	}
	function sSpawnUser(event) {
		SUsers[event.gameId] = event;
		SUsers[event.gameId].spawnFx = 1;
		if (hidde) {
			HUsers[event.gameId] = event;
			HUsers[event.gameId].spawnFx = 1;
			return false;
		}
	}	
	mod.command.add(['语音密语','語音密語'], ( )=> {
	 speak_message = !speak_message
     sendMessage(`語音密語播报已 ${speak_message?"on":"off"}.`);	
	 }); 	
	mod.command.add(['语音一般','語音一般'], ( )=> {
	 speak_normal = !speak_normal
     sendMessage(`语音一般播报已 ${speak_normal?"on":"off"}.`);	
	 }); 	
	mod.command.add(['语音组队','語音組隊'], ( )=> {
	 mod.settings.speak_voice = !mod.settings.speak_voice
     sendMessage(`语音組隊播报已 ${mod.settings.speak_voice?"on":"off"}.`);	
	 }); 
	mod.command.add(['语音公会','語音公會'], ( )=> {
	 speak_guide = !speak_guide
     sendMessage(`语音公會播报已 ${speak_guide?"on":"off"}.`);	
	 }); 
	mod.command.add(['语音领地','語音領地'], ( )=> {
	 speak_loc = !speak_loc
     sendMessage(`语音領地播报已 ${speak_loc?"on":"off"}.`);	
	 }); 
	mod.command.add(['语音交易','語音交易'], ( )=> {
	 speak_business = !speak_business
     sendMessage(`语音交易播报已 ${speak_business?"on":"off"}.`);	
	 }); 
	mod.command.add(['语音世界','語音世界'], ( )=> {
	 speak_world = !speak_world
     sendMessage(`语音世界播报已 ${speak_world?"on":"off"}.`);	
	 }); 	 
	mod.command.add(['1'], ( )=> {
	 hidde = !hidde
     sendMessage(`屏蔽玩家 ${hidde?"开启":"关闭"}.`);		 
	 if(hidde) {
	 HideAllPlayers()
	 }
	 if(!hidde) {
      ShowAllPlayers()
	 }	
	 }); 	
	mod.hook('C_USE_ITEM', 3, event => {
		if(event.id == 6560) {
	 hidde = !hidde
	 if(hidde) {
	 HideAllPlayers()
	 }
	 if(!hidde) {
      ShowAllPlayers()
	 }
			return false;
		}
	});	
	function ShowAllPlayers() {
		for (let i in HUsers) {
			mod.toClient('S_SPAWN_USER', 15, HUsers[i]);
			delete HUsers[i];
		}
	}
	function HideAllPlayers() {
			for (let i in SUsers) {
				mod.toClient('S_DESPAWN_USER', 3, { gameId: SUsers[i].gameId, type: 1 });
				HUsers[SUsers[i].gameId] = SUsers[i];
				HUsers[SUsers[i].gameId].spawnFx = 1;
			}
	}
	function sMountVehicle(event) {
		if (EqGid(event.gameId)) return;
		SUsers[event.gameId].mount = event.id;
		if (HUsers[event.gameId]) HUsers[event.gameId].mount = event.id;
	}	
	function sUnmountVehicle(event) {
		if (EqGid(event.gameId)) return;
		SUsers[event.gameId].mount = 0;
		if (HUsers[event.gameId]) HUsers[event.gameId].mount = 0;
	}	
	function sUserLocation(event) {
		if (SUsers[event.gameId]) {
			SUsers[event.gameId].loc = event.dest;
			SUsers[event.gameId].w = event.w;
		}
		if (HUsers[event.gameId]) {
			HUsers[event.gameId].loc = event.dest;
			HUsers[event.gameId].w = event.w;
			return false;
		}
	}
	function sDeadLocation(event) {
		if (SUsers[event.gameId]) SUsers[event.gameId].loc = event.loc;
		if (HUsers[event.gameId]) HUsers[event.gameId].loc = event.loc;
		spawnMarker(partyMembers.find(obj => obj.gameId == event.gameId), event.loc);		
	}	
	function sDespawnUser(event) {
		delete HUsers[event.gameId];
		delete SUsers[event.gameId];
	}
	function sUserStatus(event) {
		if (event.gameId == mod.game.me.gameId) {
			inCombat = event.status == 1
		}
		if (SUsers[event.gameId]) SUsers[event.gameId].status = event.status;
		if (HUsers[event.gameId]) {
			HUsers[event.gameId].status = event.status;
			return false;
		}
	}	
	function EqGid(xg) {
		return (xg === MyGameId);
	}
 //---------------------------------------------------------------------------------------------------------- 
	function sLogin(event) {
		MyGameId = event.gameId;
		MyGamemeId = event.name
	}
	this.destructor = function () {
   {
		logFile0.write(`<---- ${getTime(Date.now())} 结束记录 ---->\r\n`);
		logFile1.write(`<---- ${getTime(Date.now())} 结束记录 ---->\r\n`);
		logFile2.write(`<---- ${getTime(Date.now())} 结束记录 ---->\r\n`);	
		logFile4.write(`<---- ${getTime(Date.now())} 结束记录 ---->\r\n`);
		logFile27.write(`<---- ${getTime(Date.now())} 结束记录 ---->\r\n`);
		}
	}			
//---------------------------------------------------------------------------------------everthing---------------------------------
    function enable(purpose) {
        switch (purpose) {
            case 'enchant': {
                if(mod.majorPatchVersion >= 61) {
                    hook('enchant', 'C_REGISTER_ENCHANT_ITEM', 1, event => { enchanting = event });
                    hook('enchant', 'C_START_ENCHANT', 1, event => {
                        if (enchanting && event.contract === enchanting.contract) {
                            mod.send('C_REQUEST_ENCHANT', 1, enchanting);
                            return false;
                        }
                    });
                    hook('enchant', 'C_REQUEST_ENCHANT', 'event', () => false);
                } else {
                    // TODO Classic
                }
                break;
            }
            case 'upgrade': {
                if(mod.majorPatchVersion >= 79) {
                    hook('upgrade', 'C_REGISTER_EVOLUTION_ITEM', 1, event => { upgrading = event });
                    hook('upgrade', 'C_START_EVOLUTION', 1, event => {
                        if (upgrading && event.contract === upgrading.contract) {
                            mod.send('C_REQUEST_EVOLUTION', 1, upgrading);
                            return false;
                        }
                    });
                    hook('upgrade', 'C_REQUEST_EVOLUTION', 'event', () => false);
                }
                break;
            }
            case 'soulbind': {
                hook('soulbind', 'C_BIND_ITEM_BEGIN_PROGRESS', 1, event => {
                    mod.send('C_BIND_ITEM_EXECUTE', 1, {
                        contractId: event.contractId,
                    });
                    process.nextTick(() => {
                        mod.send('S_CANCEL_CONTRACT', 1, {
                            type: 32,
                            id: event.contractId,
                        });
                    });
                });
                hook('soulbind', 'C_BIND_ITEM_EXECUTE', 'event', () => false);
                break;
            }
            case 'merge': {
                hook('merge', 'S_REQUEST_CONTRACT', 1, event => {
                    if (!mod.game.me.is(event.senderId) || event.type != 33)
                        return;
                    mod.send('C_MERGE_ITEM_EXECUTE', 1, {
                        contractId: event.id,
                    });
                    process.nextTick(() => {
                        mod.send('S_CANCEL_CONTRACT', 1, {
                            type: 33,
                            id: event.id,
                        });
                    });
                });
                hook('merge', 'C_MERGE_ITEM_EXECUTE', 'event', () => false);
                break;
            }
            case 'dismantle': {
                if(mod.majorPatchVersion >= 77) {
                    hook('dismantle', 'C_RQ_START_SOCIAL_ON_PROGRESS_DECOMPOSITION', 1, event => {
                        mod.send('C_RQ_COMMIT_DECOMPOSITION_CONTRACT', 1, {
                            contract: event.contract,
                        });
                        return false;
                    });
                    hook('dismantle', 'C_RQ_COMMIT_DECOMPOSITION_CONTRACT', 'event', () => false);
                }
                break;
            }
        }
    }
    function disable(purpose) {
        if (hooks[purpose]) {
            hooks[purpose].forEach(h => mod.unhook(h));
            hooks[purpose] = [];
        }
    }
    // Main
    PURPOSES.forEach(purpose => {
		if (mod.settings.instant){
        if (mod.settings[purpose])
            enable(purpose);
		}
    });
	//-------------------------------------------------------MAKER--------------------------
	mod.command.add("尸体", (arg) => {
		if (!arg) {
			mod.settings.enabled = !mod.settings.enabled
			if (!mod.settings.enabled) removeAllMarkers()
			sendMessage("Death-Markers: " + (mod.settings.enabled ? "On" : "Off"))
		} else if (arg === "模式") {
			mod.settings.UseJobSpecificMarkers = !mod.settings.UseJobSpecificMarkers
			sendMessage("标记物设置 " + (mod.settings.UseJobSpecificMarkers ? "职业分类" : "统一样式"))
		} else {
			sendMessage("无效的参数!")
		}
	})
	mod.hook('S_DESPAWN_USER', 3, (event) => {
		if (event.type == 1) return
		removeMarker(partyMembers.find(obj => obj.gameId == event.gameId))
	})
	mod.hook('S_PARTY_MEMBER_STAT_UPDATE', 3, (event) => {
		if ((event.playerId == mod.game.me.playerId) || markers.length <= 0 || !event.alive || event.curHp <= 0) return
		removeMarker(partyMembers.find(obj => obj.playerId == event.playerId))
	})
	mod.hook('S_LEAVE_PARTY_MEMBER', 2, (event) => {
		removeMarker(partyMembers.find(obj => obj.playerId == event.playerId))
		partyMembers = partyMembers.filter(obj => obj.playerId != event.playerId)
	})
	mod.hook('S_LEAVE_PARTY', 1, (event) => {
		removeAllMarkers()
		partyMembers = []
	})
	function spawnMarker(member, loc) {
		if (!mod.settings.enabled || !member || mod.game.me.is(member.gameId)) return
		markers.push(member.playerId)
		mod.send('S_SPAWN_DROPITEM', 8, {
			gameId: member.playerId,
			loc: loc,
			item: getSpawnItem(member.class),
			amount: 1,
			expiry: 999999,
			owners: [{}]
		})
	}
	function getSpawnItem(classid) {
		if (!mod.settings.UseJobSpecificMarkers) return mod.settings.DefaultItemSpawn
		switch (classid) {
			case 1:
			case 10:
				return mod.settings.TankItemSpawn
			case 6:
			case 7:
				return mod.settings.HealerItemSpawn
			default:
				return mod.settings.DefaultItemSpawn
		}
	}
	function removeMarker(member) {
		if (!member) return
		if (markers.includes(member.playerId)) {
			mod.send('S_DESPAWN_DROPITEM', 4, {
				gameId: member.playerId
			})
			markers = markers.filter(obj => obj.playerId != member.playerId)
		}
	}
	function removeAllMarkers() {
		for (let i = 0; i < markers.length; i++) { 
			removeMarker(markers[i])
		}
		partyMembers.forEach(obj => removeMarker(obj))
		markers = []
	}	
}