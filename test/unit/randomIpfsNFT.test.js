const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("randomIpfsNFT Unit Tests", () => {
          let randomIpfsNFT, randomIpfsNFTForUser, vrfCoordinatorV2Mock, mintFee, deployer, user1
          const chainId = network.config.chainId
          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user1 = accounts[1]
              await deployments.fixture(["mocks", "randomIPFS"])
              randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", deployer)
              randomIpfsNFTForUser = await ethers.getContract("RandomIpfsNFT", user1)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              mintFee = await randomIpfsNFT.getMintFee()
              mintFeeFromUser = await randomIpfsNFTForUser.getMintFee()
          })
          describe("constructor", () => {
              it("Initialize the randomIpfsNFT carrectly", async () => {
                  const dogTokenUriZero = await randomIpfsNFT.getDogTokenUris(0)
                  const isInitialized = await randomIpfsNFT.getInitialized()
                  assert(dogTokenUriZero.includes("ipfs://"))
                  assert.equal(isInitialized, true)
              })
          })
          describe("requestNft", () => {
              it("Fails if consumer did not send the payment", async () => {
                  await expect(randomIpfsNFT.requestNFT()).to.be.revertedWith(
                      "RandomIpfsNFT__NeedMoreETHSent"
                  )
              })
              it("Emits an event and kicks off a random word request", async () => {
                  await expect(randomIpfsNFT.requestNFT({ value: mintFee })).to.emit(
                      randomIpfsNFT,
                      "NftRequested"
                  )
              })
          })
          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async function () {
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNFT.once("NftMinted", async () => {
                          try {
                              const tokenUri = await randomIpfsNFT.getDogTokenUris("0")
                              const tokenCounter = await randomIpfsNFT.getTokenCounter()
                              assert.equal(tokenUri.toString().includes("ipfs://"), true)
                              assert.equal(tokenCounter.toString(), "1")
                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const requestNftResponse = await randomIpfsNFT.requestNFT({
                              value: mintFee,
                          })
                          const requestNftReceipt = await requestNftResponse.wait(1)
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestNftReceipt.events[1].args.requestId,
                              randomIpfsNFT.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })
          describe("withdraw()", () => {
              it("Owner can withdraw from contract", async () => {
                  await randomIpfsNFT.requestNFT({ value: mintFee })
                  const deployerBalanceBefore = await deployer.getBalance()
                  const trx = await randomIpfsNFT.withdraw()
                  await trx.wait(1)
                  const deployerBalanceAfter = await deployer.getBalance()
                  assert(deployerBalanceBefore.toString() < deployerBalanceAfter.toString())
              })
              it("Not owner can NOT withdraw from contract", async () => {
                  await randomIpfsNFTForUser.requestNFT({ value: mintFeeFromUser })
                  await expect(randomIpfsNFTForUser.withdraw()).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  )
              })
          })
      })
