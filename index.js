const axios = require('axios').default;
require('dotenv').config();

// The base url. swagger-ui docs can be found here: https://api.omnicloud.io/api
const BASE_API_URL = 'https://api.omnicloud.io';
// const BASE_API_URL = 'http://localhost:6543';

(async () => {
    // 1. Obtain JWT token by providing user credentials
    // ----------------------------------------------------------------------------------------
    // try-catch blocks omitted for brevity
    // assuming everything is working as expected
    const loginResponse = await axios.post(
        `${BASE_API_URL}/user/login`,
        {
            "username": process.env.API_USERNAME,
            "password": process.env.API_PASSWORD
        }
    )
    const token = loginResponse.data["token"];
    const customer_account_id = loginResponse.data["customer_accounts"][0]["id"];
    const project_id = loginResponse.data["customer_accounts"][0]['projects'][0]["id"];

    // 2. Whare are we going to create the VM?
    // We need to obtain all Regions and choose one
    // the region can be hardcoded if the region_id is know upfront
    // ----------------------------------------------------------------------------------------
    const regionsResponse = await axios.get(`${BASE_API_URL}/regions`);
    console.log("-------------------------");
    console.log("All Regions:");
    console.log(regionsResponse.data);
    // You can hardcode the region_id if you know the exact id upfront
    // Note: region_id and physcical_region_id are used interchangeable within the Omnicloud Public API
    // in this case we will obtain the id of the Jakarta region
    const region_id = regionsResponse.data['regions'].find(region => region["name"] === "Singapore-Batam")["id"];


    // 3. Which source image we are going to use for the VM?
    // We need to obtain all Images and choose one
    // the image can be hardcoded if the image_id is know upfront
    // ----------------------------------------------------------------------------------------
    const imagesResponse = await axios.get(`${BASE_API_URL}/images`);
    console.log("-------------------------");
    console.log("All Images:");
    console.log(imagesResponse.data);
    // You can hardcode the image_id if you know the exact id upfront
    // in this case we will obtain the image for the first Cent OS 9 image
    const image_id = imagesResponse.data.find(image => image["display_name"] == 'CentOS 9')["id"];

    // 3. Which VM Falvor?
    // We need to obtain all Flavors within the region and choose one
    // the flavor (can be hardcoded if the flavor_id is know upfront)
    //
    // Note: the VM Flavors are customer specific resources, so you will need to identify yourself 
    // by provide your token as Authorization Bearer header
    // ----------------------------------------------------------------------------------------
    const flavorsResponse = await axios.get(
        `${BASE_API_URL}/projects/${project_id}/physical-regions/${region_id}/vm-flavors`,
        {
             headers: {"Authorization": `Bearer ${token}`}
        });
    console.log("-------------------------");
    console.log("All Flavors:");
    console.log(flavorsResponse.data);
    console.log(flavorsResponse.data['dedicated_vm_flavors'].find(flavor => flavor['display_name'] === process.env.DEDICATED_VM_FLAVOR_NAME));
    // You can hardcode the flavor_id if you know the exact id upfront
    // in this case we will obtain the id of the p16.16 flavor
    const flavor_id = flavorsResponse.data['dedicated_vm_flavors'].find(flavor => flavor['display_name'] === process.env.DEDICATED_VM_FLAVOR_NAME)["id"];



    // 3. Which VPC / network / routable network?
    // We need to obtain all Networks within the region and choose one
    // the network can be hardcoded if the network_id is know upfront
    //
    // Note: the VPC are customer specific resources, so you will need to identify yourself 
    // by provide your token as Authorization Bearer header
    // ----------------------------------------------------------------------------------------
    const networksResponse = await axios.get(
        `${BASE_API_URL}/projects/${project_id}/physical-regions/${region_id}/networks`,
        {
             headers: {"Authorization": `Bearer ${token}`}
        });
    console.log("-------------------------");
    console.log("All Networks:");
    console.log(networksResponse.data);
    // You can hardcode the network_id if you know the exact id upfront
    // in this case we will obtain the id of the 'default-network' network
    const network_id = networksResponse.data['networks'].find(network => network['name'] === 'default-network')["id"];


    // 4. If you need backup, then which backup schedule
    // We need to obtain all Backup Schedules and choose one
    // the backup schedule can be hardcoded if the backup_schedule_id is know upfront
    //
    // Note: the Backup Schedules are customer specific resources, so you will need to identify yourself 
    // by provide your token as Authorization Bearer header
    // ----------------------------------------------------------------------------------------
    const backupSchedulesResponse = await axios.get(
        `${BASE_API_URL}/customer-accounts/${customer_account_id}/backup-schedules`,
        {
             headers: {"Authorization": `Bearer ${token}`}
        });
    console.log("-------------------------");
    console.log("All Backup Schedules:");
    console.log(backupSchedulesResponse.data);
    // You can hardcode the backup_schedule_id if you know the exact id upfront
    // in this case we will obtain the id of the 'daily' backup schedule
    const backup_schedule_id = backupSchedulesResponse.data['backup_schedules'].find(backup_schedule => backup_schedule['name'] === 'daily')["id"];

    // 5. Crete the VM
    // The VM creation is asynchroneous process.
    // In other words: With this API you just trigger the creation process, but the whole process of creation takes time
    // you can monitor the status of the VM creation process by obtaining the list of VMs
    // and looking up the status of the VM which is named after the one you request here
    //
    // Note: you will need to identify yourself by provide your token as Authorization Bearer header
    // ----------------------------------------------------------------------------------------
    try {
    const createVM = await axios.post(
        `${BASE_API_URL}/projects/${project_id}/physical-regions/${region_id}/instanceswe`,
        {
            "vm_instance_name": "test-vm",
            "source_type": "image",
            // soure_object_id should point to the image_id
            "source_object_id": image_id,
            "destination_type": "local_disk",
            // if local storage, then voume_type is null
            "volume_type": null,
            // the consumable_product_flavor_id should point to the flavor_id
            "consumable_product_flavor_id": flavor_id,
            "network_id": network_id,
            // Instruct the VM crete workflow to automatically assign floating ip
            "assign_floating_ip": true,
            "ssh_key_name": process.env.SSH_KEY_NAME,
            "firewall_name": process.env.FIREWALL_NAME,
            // we are injecting the ssh keys, hence we don't need to setup admin user password
            // so, in this case the rootpwd should be set to null
            "rootpwd": null,
            "userdata": null,
            "backup_schedule_id": backup_schedule_id,
            "server_count": 1
        },
        {
             headers: {"Authorization": `Bearer ${token}`}
        });
    } catch (err) {
        console.log(err);
    }
})();
