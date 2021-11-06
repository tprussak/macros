/*
 * The Dragon Puff macro calculates damage for a dragon's puff attack.
 * It opens a window to allow a player to choose the number of breath points to use.
 * 
 * If a token is not selected, the macro will default back to the default character for the Actor. 
 * This allows for the GM to cast the macro on behalf a character that possesses it, 
 * without requiring that a PC have their character selected.
 * To execute the macro a target MUST be specified and, unless configured otherwise, the character must have an available spell slot. 
 * Make your regular attack and then if you choose to use Divine Smite, run this macro.
 */

(() => {

// Use token selected, or default character for the Actor if none is.
let s_actor = canvas.tokens.controlled[0]?.actor || game.user.character;

//Configurable variables
let maxPool = s_actor.data.data.resources.primary.maxvalue / 2; //  Size of pool.
let currentPool = s.actor.data.data.resources.primary.value // Current points.

let confirmed = false;

// Create a dialogue box to select spell slot level to use when smiting.
new Dialog({
    title: "Dragon Breath: Usage Configuration",
      content: `
      <form id="breath-use-form">
        <p>` + "Testing" + `</p>
        <div class="form-group">
            <label>Points Used</label>
            <div class="form-fields">
            <select name="points-used">` + optionsText + `</select>
            </div>
        </div>

        <div class="form-group">
            <label class="checkbox">
            <input type="checkbox" name="consumeCheckbox" checked/>` + "Consume breath points?") + `</label>
        </div>

        <div class="form-group">
            <label class="checkbox">
            <input type="checkbox" name="criticalCheckbox"/>` + game.i18n.localize("DND5E.CriticalHit") + "?" + `</label>
        </div>
    </form>
    `,
    buttons: {
        one: {
            icon: '<i class="fas fa-check"></i>',
            label: "Attack",
            callback: () => confirmed = true
        },
        two: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel",
            callback: () => confirmed = false
        }
    },
    default: "Cancel",
    close: html => {
        if (confirmed) {
            let breathPoints = parseInt(html.find('[name=points_used]')[0].value);
            const criticalHit = html.find('[name=criticalCheckbox]')[0].checked;				
            const consumePoints = html.find('[name=consumeCheckbox]')[0].checked;
            breath(s_actor, breathPoints, criticalHit, consumePoints);
        }
    }
}).render(true);

/**
 * Use the controlled token to breathe at the targeted token.
 * @param {Actor5e} actor - the actor that is performing the action.
 * @param {integer} breathPoints - the number of breath points to use when smiting.
 * @param {boolean} criticalHit - whether the hit is a critical hit.
 * @param {boolean} consume - whether to consume the points.
 */
function smite(actor, breathPoints, criticalHit, consume) {
    let targets = game.user.targets;

    if (targets.size !== 1) {
        ui.notifications.error("You must target exactly one token to Breath Puff.");
        return;
    }

    targets.forEach(target => {
        let numDice = breathPoints;
        let type = target.actor.data.data.details.type.value?.toLocaleLowerCase();
        if (affectedCreatureTypes.includes(type)) numDice += 1;
        if (criticalHit) numDice *= 2;
        const flavor = `Macro Dragon Puff - ${game.i18n.localize("DND5E.DamageRoll")} (${game.i18n.localize("DND5E.DamageAcid")})`;
        let damageRoll = new Roll(`${numDice}d8`);

        let targetActor = game.user.targets.values().next().value.actor;
        
        if (targetActor.permission !== CONST.ENTITY_PERMISSIONS.OWNER) {
            // We need help applying the damage, so make a roll message for right-click convenience.
            damageRoll.roll().toMessage({
                speaker: ChatMessage.getSpeaker(),
                flavor: `${actor.name} puffed ${targetActor.data.name}.<br>${flavor}
                <p><em>Manually apply (or right-click) ${damageRoll.result} HP of damage to ${targetActor.data.name}</em></p>` });
        }
        else {
            // We can apply damage automatically, so just show a normal chat message.
            damageRoll.roll().toMessage({
                speaker: ChatMessage.getSpeaker(),
                flavor: `${actor.name} puffed ${targetActor.data.name}.<br>${flavor}
                <p><em>${targetActor.data.name} has taken ${damageRoll.result} HP of damage.</em></p>` });
            targetActor.update({"data.attributes.hp.value" : targetActor.data.data.attributes.hp.value - damageRoll.result});
        }
    })

    if (consume){
        let objUpdate = new Object();
        objUpdate['data.resources.primary.value'] = currentPool - breathPoints;
        
        actor.update(objUpdate);
    }
}

})();
