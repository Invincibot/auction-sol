App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  loadingAdmin: false,

  init: function() {
    console.log("Main script initalized.")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);
    }

    else {
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:8545');
      web3 = new Web3(App.web3Provider);
    }

    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("Auction.json", function(auction) {
      App.contracts.auction = TruffleContract(auction);
      App.contracts.auction.setProvider(App.web3Provider);
      App.contracts.auction.deployed().then(function(auction) {
        console.log(auction.address);
      });

      return App.render();
    });
  },

  render: function() {
    if (App.loading) {
      return;
    }

    App.loading = true;

    var loader = document.getElementById('loader');
    var content = document.getElementById('content');
    loader.style.display = 'block';
    content.style.display = 'none';

    web3.eth.getCoinbase(function(err, account) {
      if (err == null) {
        App.account = account;
        $('#account-address').html(App.account);
        console.log(account);
      }

      else
        console.log(err);

      return web3.eth.getBalance(account, function(err, balance) {
        if (err == null) {
          var balanceEth = web3.fromWei(balance);
          var balanceEthStr = balanceEth.c[0].toString() + "." + balanceEth.c[1].toString();
          $('#account-balance').html(balanceEthStr);
          console.log(balanceEthStr);
        }
      })
    });

    loader.style.display = 'none';
    content.style.display = 'block';

    App.loading = false;

    return App.renderAdmin();
  },

  renderAdmin: function () {
    if (App.loadingAdmin) {
      return;
    }

    App.loadingAdmin = true;

    App.loadingAdmin = false;
  },
}

$(function() {
  $(window).load(function() {
    App.init();
  });
});
