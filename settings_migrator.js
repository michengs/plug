const DefaultSettings = {
    "autoServant": true,
    "servantUseAt": 50,
    "servantFoods": [206046, 206047, 206048],
    "servantGifts": [206049, 206050, 206051],
    "flyMore": true,
    "unLockFlying": true,
    "afk": true,
    "successChance": true,
    "sutsceneSkip": false,
    "noBodyBlock": true,
    "vanguard": true,
	"useNostrum": true,
	"useCCB": true,
	"useBP": true,	
	"nostrumTime": 5,
	"BPTime": 1,	
	"CCBTime": 10,
	"dungeonOnly": false,
	"log": false,
	"nostrum": 201006,
	"BP": 202015,	
	"ccb": 354,
	"detect": false,
    "shake": false,
    "power": 1.0,
    "speed": 1.0,
    "quickload": true,	
	"speak_voice": false,
	"enchant": true,
    "upgrade": true,
    "soulbind": true,
    "merge": true,
    "dismantle": true,
    "instant": true,
    "enabled": true,
    "DefaultItemSpawn": 89542,     // 
    "UseJobSpecificMarkers": true, // 按职业分类
    "TankItemSpawn":   89544,
    "HealerItemSpawn": 89543	
}

module.exports = function MigrateSettings(from_ver, to_ver, settings) {
    if (from_ver === undefined) {
        // Migrate legacy config file
        return Object.assign(Object.assign({}, DefaultSettings), settings)
    } else if (from_ver === null) {
        // No config file exists, use default settings
        return DefaultSettings
    } else {
        // Migrate from older version (using the new system) to latest one
        if (from_ver + 1 < to_ver) { // Recursively upgrade in one-version steps
            settings = MigrateSettings(from_ver, from_ver + 1, settings)
            return MigrateSettings(from_ver + 1, to_ver, settings)
        }
        // If we reach this point it's guaranteed that from_ver === to_ver - 1, so we can implement
        // a switch for each version step that upgrades to the next version. This enables us to
        // upgrade from any version to the latest version without additional effort!
        switch (to_ver) {
            default:
                let oldsettings = settings
                settings = Object.assign(DefaultSettings, {})
                for (let option in oldsettings) {
                    if (settings[option]) {
                        settings[option] = oldsettings[option]
                    }
                }
                break
        }
        return settings
    }
}
