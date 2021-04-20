function UpdatePageStyling() {
	let containers = document.getElementsByClassName('board-container');
	let items = document.getElementsByClassName("board-item");

	for (let container of containers) {
		container.style.display = "block";
	}

	for (let item of items) {
		item.style.display = "inline-block";
		item.style['min-width'] = "670px";
	}

	items = document.getElementsByClassName('board-item-content');
	for (let item of items) {
		item.style['min-width'] = "670px";
	}
}


async function CheckInvestments() {
	let div = document.createElement('div');
	div.style.display = "block";
	div.style.position = "absolute";
	div.style['z-index'] = 100000000000;
	div.style['background-color'] = "white";
	div.style.top = "0px";
	div.style.bottom = "0px";
	div.style.overflow = "scroll";

	let btn = document.createElement('button');
	btn.innerText = "Close";
	btn.addEventListener('click', ()=>{
		document.body.removeChild(div);
	});
	div.appendChild(btn);
	document.body.appendChild(div);


	let user = await (await fetch('/api/getUserInfo')).json();
	let history = await (await fetch('/api/getHistory')).json();
	let stats = await (await fetch('/api/getStats')).json();

	let wallet = JSON.parse(user.wallet);

	let myHistory = history.history.map(
		snapshot => snapshot.transactions.filter(action => action.userid == user.id)
	).reduce((prev, curr) => [...prev, ...curr], []);

	let buys = myHistory.filter(snap => snap.type == 0);

	// Find the cost of each purchase
	let purchase_rates = buys.map( x => {
		// Find the closest time stamp in relation to this purchase
		let closest = stats.coinHistory[0];
		let dist = Math.abs(stats.coinHistory[0].timestamp - x.timestamp);
		for (let i=1; i<stats.coinHistory.length; i++) {
			let nx = stats.coinHistory[i];
			let nx_dist = Math.abs(nx.timestamp - x.timestamp);
			if (nx_dist < dist) {
				closest = nx;
				dist = nx_dist;
			} else if (nx_dist > dist) { // the dataset is sorted, hence it will reach the closet point
				break;
			}
		}

		x.cost = closest.data[x.coin].price;
		return x;
	});

	function ProduceRow(arr, header = false) {
		let tr = document.createElement('tr');

		for (let val of arr) {
			let elm = document.createElement(header ? 'th' : 'td');
			elm.innerText = val;
			tr.appendChild(elm);
		}

		return tr;
	}

	let table = document.createElement('table');
	table.appendChild(ProduceRow(['Coin', 'Bought At', 'Current Rate', 'Delta'], true));
	div.appendChild(table);


	// let coins = new Set(purchase_rates.map(x => x.coin));
	let results = [];
	for (let type in wallet.coins) {
		if (wallet.coins[type].amt === 0) {
			continue;
		}

		let total_cost = purchase_rates
			.filter(x => x.coin == type)
			.reverse()
			.slice(0, wallet.coins[type].amt)
			.map(x => x.cost)
			.reduce((prev, curr) => prev+curr, 0);

		let worth = stats.coinInfo.data[type].price * wallet.coins[type].amt;
		results.push([
			type,
			total_cost.toFixed(2),
			worth.toFixed(2),
			(worth-total_cost).toFixed(2)
		]);
	}

	results.sort((a, b) => b[3] - a[3]);
	for (let result of results) {
		table.appendChild(ProduceRow(result));
	}
}


fixStyling.addEventListener("click", async (evt) => {
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		function: UpdatePageStyling,
	});
});
checkInvst.addEventListener("click", async (evt) => {
	let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

	chrome.scripting.executeScript({
		target: { tabId: tab.id },
		function: CheckInvestments,
	});
});