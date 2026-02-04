// AXI4 Slave Interface Module
module axi4_slave #(
  parameter ADDR_WIDTH = 32,
  parameter DATA_WIDTH = 32
) (
  // Global signals
  input  logic                    aclk,
  input  logic                    aresetn,
  
  // Write address channel
  input  logic [ADDR_WIDTH-1:0]   awaddr,
  input  logic                    awvalid,
  output logic                    awready,
  
  // Write data channel
  input  logic [DATA_WIDTH-1:0]   wdata,
  input  logic [DATA_WIDTH/8-1:0] wstrb,
  input  logic                    wvalid,
  output logic                    wready,
  
  // Write response channel
  output logic [1:0]              bresp,
  output logic                    bvalid,
  input  logic                    bready,
  
  // Read address channel
  input  logic [ADDR_WIDTH-1:0]   araddr,
  input  logic                    arvalid,
  output logic                    arready,
  
  // Read data channel
  output logic [DATA_WIDTH-1:0]   rdata,
  output logic [1:0]              rresp,
  output logic                    rvalid,
  input  logic                    rready
);

  // Internal memory
  logic [DATA_WIDTH-1:0] mem [0:1023];
  
  // Write address channel
  always_ff @(posedge aclk or negedge aresetn) begin
    if (!aresetn) begin
      awready <= 1'b0;
    end else begin
      awready <= awvalid;
    end
  end
  
  // Write data channel
  always_ff @(posedge aclk or negedge aresetn) begin
    if (!aresetn) begin
      wready <= 1'b0;
    end else begin
      wready <= wvalid;
    end
  end
  
  // Write response channel
  always_ff @(posedge aclk or negedge aresetn) begin
    if (!aresetn) begin
      bvalid <= 1'b0;
      bresp <= 2'b00;
    end else if (wvalid && wready) begin
      bvalid <= 1'b1;
      bresp <= 2'b00; // OKAY
    end else if (bvalid && bready) begin
      bvalid <= 1'b0;
    end
  end
  
  // Read address channel
  always_ff @(posedge aclk or negedge aresetn) begin
    if (!aresetn) begin
      arready <= 1'b0;
    end else begin
      arready <= arvalid;
    end
  end
  
  // Read data channel
  always_ff @(posedge aclk or negedge aresetn) begin
    if (!aresetn) begin
      rvalid <= 1'b0;
      rdata <= '0;
      rresp <= 2'b00;
    end else if (arvalid && arready) begin
      rvalid <= 1'b1;
      rdata <= mem[araddr[9:0]];
      rresp <= 2'b00; // OKAY
    end else if (rvalid && rready) begin
      rvalid <= 1'b0;
    end
  end
  
  // Memory write logic
  always_ff @(posedge aclk) begin
    if (wvalid && wready) begin
      for (int i = 0; i < DATA_WIDTH/8; i++) begin
        if (wstrb[i]) begin
          mem[awaddr[9:0]][i*8 +: 8] <= wdata[i*8 +: 8];
        end
      end
    end
  end

endmodule
