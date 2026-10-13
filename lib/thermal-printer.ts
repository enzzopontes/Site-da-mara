/**
 * Utilitário para impressão em mini impressoras térmicas (58mm) via Web Bluetooth e WebUSB.
 * Compatível com o modelo Kapbom KA-1445 e similares que usam protocolo ESC/POS.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type BluetoothDevice = any;
type BluetoothRemoteGATTCharacteristic = any;
type USBDevice = any;

export class ThermalPrinter {
  private bluetoothDevice: BluetoothDevice | null = null;
  private bluetoothCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  
  private usbDevice: USBDevice | null = null;
  private usbInterface: number = 0;
  private usbEndpoint: number = 0;

  // Comandos ESC/POS básicos
  private static readonly ESC = 0x1b;
  private static readonly GS = 0x1d;
  private static readonly LF = 0x0a;

  /**
   * Tenta conectar via USB (Prioridade por ser mais estável)
   */
  async connectUSB() {
    try {
      this.usbDevice = await (navigator as any).usb.requestDevice({ filters: [] }); // Filtro vazio para listar todas e o usuário escolher
      await this.usbDevice.open();
      
      // Encontrar a interface de impressão (geralmente a primeira)
      const configuration = this.usbDevice.configurations[0];
      this.usbInterface = configuration.interfaces[0].interfaceNumber;
      
      await this.usbDevice.selectConfiguration(1);
      await this.usbDevice.claimInterface(this.usbInterface);
      
      // Encontrar o endpoint de saída (OUT)
      const endpoint = configuration.interfaces[0].alternates[0].endpoints.find((e: any) => e.direction === 'out');
      this.usbEndpoint = endpoint?.endpointNumber || 1;

      return true;
    } catch (error) {
      console.error("Erro ao conectar via USB:", error);
      return false;
    }
  }

  /**
   * Conecta via Bluetooth (Alternativa)
   */
  async connectBluetooth() {
    try {
      this.bluetoothDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { namePrefix: 'MTP' },
          { namePrefix: 'KA-1445' }
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await this.bluetoothDevice.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristics = await service?.getCharacteristics();
      
      this.bluetoothCharacteristic = characteristics?.find((c: any) => c.properties.write || c.properties.writeWithoutResponse) || null;

      return !!this.bluetoothCharacteristic;
    } catch (error) {
      console.error("Erro ao conectar via Bluetooth:", error);
      return false;
    }
  }

  /**
   * Envia dados brutos para a impressora (USB ou Bluetooth)
   */
  private async write(data: Uint8Array) {
    // Tentar USB primeiro
    if (this.usbDevice && this.usbDevice.opened) {
      await this.usbDevice.transferOut(this.usbEndpoint, data);
      return;
    }

    // Tentar Bluetooth
    if (this.bluetoothCharacteristic) {
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await this.bluetoothCharacteristic.writeValue(chunk);
      }
      return;
    }
  }

  /**
   * Remove caracteres de controle (ESC, GS, etc.) para evitar injeção de comandos na impressora térmica
   */
  private sanitize(text: any): string {
    if (text === null || text === undefined) return '';
    return String(text).replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '');
  }

  /**
   * Formata e imprime um pedido
   */
  async printOrder(order: any) {
    // Se não houver conexão, tenta USB primeiro, depois Bluetooth
    if (!this.usbDevice?.opened && !this.bluetoothCharacteristic) {
      const usbConnected = await this.connectUSB();
      if (!usbConnected) {
        const btConnected = await this.connectBluetooth();
        if (!btConnected) {
          throw new Error("Nenhuma impressora conectada.");
        }
      }
    }

    const encoder = new TextEncoder();
    const commands = [];

    // Inicializar
    commands.push(ThermalPrinter.ESC, 0x40);

    // Cabeçalho Centralizado
    commands.push(ThermalPrinter.ESC, 0x61, 0x01);
    commands.push(ThermalPrinter.GS, 0x21, 0x11); // Dobro de tamanho
    commands.push(...Array.from(encoder.encode("batata top\n")));
    
    commands.push(ThermalPrinter.GS, 0x21, 0x00); // Tamanho normal
    commands.push(...Array.from(encoder.encode("Delivery de Batatas\n")));
    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Dados do Pedido
    commands.push(ThermalPrinter.ESC, 0x61, 0x00); // Esquerda
    commands.push(...Array.from(encoder.encode(`Pedido: #${this.sanitize(order.id).substring(0, 8)}\n`)));
    commands.push(...Array.from(encoder.encode(`Data: ${new Date().toLocaleString('pt-BR')}\n`)));
    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Itens
    commands.push(ThermalPrinter.ESC, 0x45, 0x01); // Negrito
    commands.push(...Array.from(encoder.encode("ITENS:\n")));
    commands.push(ThermalPrinter.ESC, 0x45, 0x00);
    
    (order.items || []).forEach((item: any) => {
      const cleanQty = Number(item.quantity) || 1;
      const cleanName = this.sanitize(item.name || 'Item');
      commands.push(...Array.from(encoder.encode(`${cleanQty}x ${cleanName}\n`)));
      if (item.adicionais && item.adicionais.length > 0) {
        const adds = item.adicionais.map((a: any) => this.sanitize(a.name)).filter(Boolean).join(", ");
        commands.push(...Array.from(encoder.encode(` + ${adds}\n`)));
      }
      const price = (Number(item.price || 0) * cleanQty).toFixed(2).replace('.', ',');
      commands.push(...Array.from(encoder.encode(`               R$ ${price}\n`)));
    });

    commands.push(...Array.from(encoder.encode("--------------------------------\n")));
    
    // Total
    commands.push(ThermalPrinter.GS, 0x21, 0x01); // Altura dupla
    const total = Number(order.total || 0).toFixed(2).replace('.', ',');
    commands.push(...Array.from(encoder.encode(`TOTAL: R$ ${total}\n`)));
    commands.push(ThermalPrinter.GS, 0x21, 0x00);

    commands.push(...Array.from(encoder.encode("--------------------------------\n")));

    // Endereço
    commands.push(...Array.from(encoder.encode("ENTREGA EM:\n")));
    if (typeof order.address === 'string') {
      commands.push(...Array.from(encoder.encode(`${this.sanitize(order.address)}\n`)));
    } else if (order.address) {
      const cleanStreet = this.sanitize(order.address.street || '');
      const cleanNum = this.sanitize(order.address.number || '');
      commands.push(...Array.from(encoder.encode(`${cleanStreet}, ${cleanNum}\n`)));
      if (order.address.neighborhood) {
        commands.push(...Array.from(encoder.encode(`${this.sanitize(order.address.neighborhood)}\n`)));
      }
    }

    commands.push(...Array.from(encoder.encode("--------------------------------\n")));
    
    // Rodapé
    commands.push(ThermalPrinter.ESC, 0x61, 0x01);
    commands.push(...Array.from(encoder.encode("Obrigado pela preferência!\n")));
    commands.push(...Array.from(encoder.encode("\n\n\n\n"))); // Espaço para rasgar

    await this.write(new Uint8Array(commands));
  }
}

export const thermalPrinter = new ThermalPrinter();
