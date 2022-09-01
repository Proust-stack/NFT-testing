const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")
const fs = require("fs")

module.exports = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    //basic nft
    basicNFT = await ethers.getContract("BasicNFT", deployer)
    basicNFTMintTrx = await basicNFT.mintNFT()
    await basicNFTMintTrx.wait(1)
    const tokenURI = await basicNFT.tokenURI(0)
    console.log(`Contract basicNFT index 0 has tokenURI: ${tokenURI}`)

    //randomIpfsNFT
    randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", deployer)
    const mintFee = await randomIpfsNFT.getMintFee()
    const randomIpfsNFTTrx = await randomIpfsNFT.requestNFT({ value: mintFee.toString() })
    const requestNftReceipt = await randomIpfsNFTTrx.wait(1)

    await new Promise(async (resolve, reject) => {
        setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 200000) // 5 minute timeout time
        randomIpfsNFT.once("NftMinted", async () => {
            try {
                resolve()
            } catch (e) {
                console.log(e)
                reject(e)
            }
        })

        if (developmentChains.includes(network.name)) {
            const requestId = requestNftReceipt.events[1].args.requestId
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNFT.address)
        }
    })
    console.log(
        `Contract randomIpfsNFT index 0 has tokenURI: ${await randomIpfsNFT.getDogTokenUris(0)}`
    )

    //dynamicSvgNft
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNFT", deployer)
    const highValue = ethers.utils.parseEther("4000")
    const dynamicSvgNftMintTrx = await dynamicSvgNft.mintNFT(highValue)
    await dynamicSvgNftMintTrx.wait(1)
    const tokenURIDynamicNFT = await dynamicSvgNft.tokenURI(0)
    console.log(`Contract dynamicSvgNft index 0 has tokenURI: ${tokenURIDynamicNFT}`)
}

module.exports.tags = ["all", "mint"]
